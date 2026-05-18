package com.shoppingai.backend;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*") // CORS hatasını kökünden çözen satırımız
public class SearchController {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    // SerpApi anahtarımızı application.properties dosyasından çekiyoruz
    @Value("${serpapi.api.key}")
    private String serpApiKey;

    @GetMapping("/analyze")
    public ResponseEntity<?> analyzeProduct(@RequestParam String query) {

        String serpApiUrl = "https://serpapi.com/search.json?engine=google_shopping&q="
                + query.replace(" ", "+") + "&gl=tr&hl=tr&api_key=" + serpApiKey;

        try {
            String rawResponse = restTemplate.getForObject(serpApiUrl, String.class);

            // SERPAPI'NIN BİZE NE DEDİĞİNİ İNTELLİJ KONSOLUNDA GÖRMEK İÇİN:
            System.out.println("=== SERPAPI YANITI ===");
            System.out.println(rawResponse);
            System.out.println("======================");

            if (rawResponse == null) return ResponseEntity.badRequest().body("{ \"error\": \"SerpApi'den boş yanıt geldi\" }");

            JsonNode root = objectMapper.readTree(rawResponse);

            // EĞER SERPAPI BİZE BİR HATA (Örn: Geçersiz API Anahtarı) DÖNDÜYSE BUNU REACT'A İLET:
            if (root.has("error")) {
                return ResponseEntity.badRequest().body("{ \"error\": \"SerpApi Hatası: " + root.get("error").asText() + "\" }");
            }

            JsonNode shoppingResults = root.path("shopping_results");
            List<Map<String, String>> productList = new ArrayList<>();

            if (shoppingResults.isArray()) {
                int count = 0;
                for (JsonNode item : shoppingResults) {
                    if (count >= 50) break;

                    String name = item.path("title").asText("");
                    String price = item.path("price").asText("Fiyat Yok");
                    // Bazen link "product_link" bazen "link" olarak gelir, ikisini de kontrol ediyoruz:
                    String productUrl = item.path("product_link").asText(item.path("link").asText(""));
                    String source = item.path("source").asText("Bilinmiyor");
                    String rating = item.path("rating").asText("N/A");

                    if (!name.isEmpty() && !productUrl.isEmpty()) {
                        Map<String, String> product = new HashMap<>();
                        product.put("name", name);
                        product.put("price", price);
                        product.put("site", source);
                        product.put("url", productUrl);
                        product.put("rating", rating);
                        product.put("image", item.path("thumbnail").asText(""));

                        productList.add(product);
                        count++;
                    }
                }
            }

            // Eğer hata yok ama liste boş döndüyse:
            if (productList.isEmpty()) {
                return ResponseEntity.badRequest().body("{ \"error\": \"Bu arama için ürün bulunamadı. Lütfen başka bir kelime deneyin.\" }");
            }

            return ResponseEntity.ok(productList);

        } catch (Exception e) {
            String safeError = e.getMessage().replace("\"", "'").replace("\n", " ");
            return ResponseEntity.status(500).body("{ \"error\": \"Sistem Hatası: " + safeError + "\" }");
        }
    }
    @PostMapping("/combine")
    public ResponseEntity<?> getCombination(@RequestBody Map<String, String> request) {
        String productName = request.get("productName");

        if (productName == null || productName.isBlank()) {
            return ResponseEntity.badRequest().body("{ \"error\": \"Ürün adı boş olamaz\" }");
        }

        // 1. AŞAMA: GEMİNİ'DEN SPESİFİK ARAMA KELİMELERİ (QUERY) İSTİYORUZ
        String prompt = "Kullanıcı şu ürünü seçti: '" + productName + "'. " +
                "Bu ürüne uygun 3 parçalık (kıyafet, ayakkabı, aksesuar vb.) şık bir kombin önerisi hazırla. " +
                "Her parça için e-ticaret sitelerinde aratılabilecek çok net ve spesifik bir arama kelimesi ('query') ve bir kombin ipucu ('tip') yaz. " +
                "Örn: { \"combination\": [ {\"query\": \"siyah deri ceket kadın\", \"tip\": \"Havalı bir görünüm katar\"} ] } " +
                "Açıklamalar tamamen TÜRKÇE olsun. Çift tırnak (\") içine alırken dikkatli ol. " +
                "SADECE bu JSON formatında cevap ver, direkt { ile başla.";

        String url = GEMINI_URL + apiKey;
        Map<String, Object> requestBody = Map.of("contents", new Object[]{ Map.of("parts", new Object[]{ Map.of("text", prompt) }) });

        try {
            // Gemini'den yanıtı al ve temizle
            String rawResponse = restTemplate.postForObject(url, requestBody, String.class);
            if (rawResponse == null) return ResponseEntity.badRequest().body("{ \"error\": \"Gemini'den boş yanıt geldi\" }");

            String text = cleanJson(extractTextFromGemini(rawResponse));
            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start != -1 && end != -1) text = text.substring(start, end + 1);

            // Gemini'nin önerdiği kombinleri parse et
            JsonNode root = objectMapper.readTree(text);
            JsonNode combinationNodes = root.path("combination");

            List<Map<String, String>> enrichedCombination = new ArrayList<>();

            // 2. AŞAMA: HER BİR KOMBİN PARÇASI İÇİN SERPAPI'DEN GERÇEK ÜRÜN ÇEK
            if (combinationNodes.isArray()) {
                for (JsonNode node : combinationNodes) {
                    String query = node.path("query").asText();
                    String tip = node.path("tip").asText();

                    // SerpApi'ye bu kombin parçası için istek atıyoruz (Sadece 1 sonuç yeterli)
                    String serpApiUrl = "https://serpapi.com/search.json?engine=google_shopping&q="
                            + query.replace(" ", "+") + "&gl=tr&hl=tr&api_key=" + serpApiKey;

                    Map<String, String> itemData = new HashMap<>();
                    itemData.put("tip", tip);

                    try {
                        String serpRaw = restTemplate.getForObject(serpApiUrl, String.class);
                        JsonNode serpRoot = objectMapper.readTree(serpRaw);
                        JsonNode shoppingResults = serpRoot.path("shopping_results");

                        // Gerçek ürün bulunduysa verileri al
                        if (shoppingResults.isArray() && shoppingResults.size() > 0) {
                            JsonNode firstItem = shoppingResults.get(0);
                            itemData.put("item", firstItem.path("title").asText(query));
                            itemData.put("price", firstItem.path("price").asText("Fiyat Yok"));
                            itemData.put("url", firstItem.path("product_link").asText(firstItem.path("link").asText("")));
                            itemData.put("site", firstItem.path("source").asText("Bilinmiyor"));
                            itemData.put("image", firstItem.path("thumbnail").asText(""));
                        } else {
                            itemData.put("item", query);
                            itemData.put("price", "Bulunamadı");
                            itemData.put("url", "");
                            itemData.put("site", "-");
                        }
                    } catch (Exception e) {
                        itemData.put("item", query);
                        itemData.put("price", "-");
                        itemData.put("url", "");
                        itemData.put("site", "-");
                    }
                    enrichedCombination.add(itemData);
                }
            }

            // Gerçek fiyatlı ve linkli listeyi Frontend'e yolla
            return ResponseEntity.ok(Map.of("combination", enrichedCombination));

        } catch (Exception e) {
            String safeError = e.getMessage().replace("\"", "'").replace("\n", " ");
            return ResponseEntity.status(500).body("{ \"error\": \"Kombin Hatası: " + safeError + "\" }");
        }
    }
    private String extractTextFromGemini(String rawResponse) throws Exception {
        JsonNode root = objectMapper.readTree(rawResponse);
        return root
                .path("candidates").get(0)
                .path("content")
                .path("parts").get(0)
                .path("text").asText();
    }

    private String cleanJson(String text) {
        return text
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*", "")
                .replace('\u201C', '"')
                .replace('\u201D', '"')
                .replace('\u2018', '\'')
                .replace('\u2019', '\'')
                .replace('\u201E', '"')
                .replace('\u201F', '"')
                .replaceAll("[\\u200B\\u200C\\u200D\\uFEFF]", "")
                .replaceAll("[\\t\\n\\r]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}