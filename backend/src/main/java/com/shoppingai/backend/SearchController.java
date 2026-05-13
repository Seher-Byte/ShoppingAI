package com.shoppingai.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    @GetMapping("/analyze")
    public ResponseEntity<String> analyzeProduct(@RequestParam String query) {
        String url = GEMINI_URL + apiKey;

        String prompt = "Türkiye'deki e-ticaret sitelerinde (Trendyol, Hepsiburada, Amazon Türkiye, n11) '" + query + "' ürününü ara. " +
                "Her ürün için o ürünün direkt sayfasına giden tam URL'yi bul. Ana sayfa veya arama sayfası URL'si verme, sadece o ürünün kendi sayfasının linki olsun. " +
                "En iyi 5 sonucu listele. " +
                "SADECE şu JSON yapısında cevap ver (markdown kullanma, direkt [ ile başla): " +
                "[{ \"name\": \"ürün adı\", \"price\": \"fiyat\", \"site\": \"site adı\", \"url\": \"ürünün direkt sayfası linki\", \"rating\": \"puan\" }]";

        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                },
                "tools", new Object[]{
                        Map.of("google_search", Map.of())
                }
        );

        try {
            String rawResponse = restTemplate.postForObject(url, requestBody, String.class);
            if (rawResponse == null) return ResponseEntity.ok("{ \"error\": \"Boş yanıt\" }");

            String text = extractTextFromGemini(rawResponse);
            text = cleanJson(text);

            int start = text.indexOf('[');
            int end = text.lastIndexOf(']');
            if (start != -1 && end != -1) {
                text = text.substring(start, end + 1);
            }

            // Geçerli JSON mı kontrol et
            objectMapper.readTree(text);

            return ResponseEntity.ok(text);

        } catch (Exception e) {
            return ResponseEntity.ok("{ \"error\": \"API hatası: " + e.getMessage() + "\" }");
        }
    }

    @PostMapping("/combine")
    public ResponseEntity<String> getCombination(@RequestBody Map<String, String> request) {
        String productName = request.get("productName");

        if (productName == null || productName.isBlank()) {
            return ResponseEntity.badRequest().body("{ \"error\": \"productName boş olamaz\" }");
        }

        String prompt = "A user selected the product: '" + productName + "'. " +
                "Suggest a stylish 3-piece outfit combination with shoes and accessories. " +
                "Reply ONLY with this exact JSON format, no markdown, start directly with {: " +
                "{ \"combination\": [ {\"item\": \"item name\", \"tip\": \"styling tip\"}, {\"item\": \"item name\", \"tip\": \"styling tip\"}, {\"item\": \"item name\", \"tip\": \"styling tip\"} ] }";

        String url = GEMINI_URL + apiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        try {
            String rawResponse = restTemplate.postForObject(url, requestBody, String.class);
            if (rawResponse == null) return ResponseEntity.ok("{ \"error\": \"Boş yanıt\" }");

            String text = extractTextFromGemini(rawResponse);

            // Ham yanıtı logla — IntelliJ konsolunda göreceksin
            System.out.println("=== GEMINI COMBINE RAW ===");
            System.out.println(text);
            System.out.println("==========================");

            text = cleanJson(text);

            int start = text.indexOf('{');
            int end = text.lastIndexOf('}');
            if (start != -1 && end != -1) {
                text = text.substring(start, end + 1);
            }

            // Geçerli JSON mı kontrol et
            objectMapper.readTree(text);

            return ResponseEntity.ok(text);

        } catch (Exception e) {
            System.out.println("=== COMBINE HATA ===");
            System.out.println(e.getMessage());
            return ResponseEntity.ok("{ \"error\": \"API hatası: " + e.getMessage() + "\" }");
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
                // Markdown kod bloklarını temizle
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*", "")
                // Eğri/akıllı tırnak işaretlerini düz tırnakla değiştir
                .replace('\u201C', '"')
                .replace('\u201D', '"')
                .replace('\u2018', '\'')
                .replace('\u2019', '\'')
                .replace('\u201E', '"')
                .replace('\u201F', '"')
                // Sıfır genişlikli karakterleri temizle
                .replaceAll("[\\u200B\\u200C\\u200D\\uFEFF]", "")
                // Satır başı/sonu boşluklarını temizle
                .trim();
    }
}