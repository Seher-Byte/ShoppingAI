package com.shoppingai.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "http://localhost:5173")
public class SearchController {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Autowired
    private RestTemplate restTemplate;

    private final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    @GetMapping("/analyze")
    public String analyzeProduct(@RequestParam String query) {
        String prompt = "Sen profesyonel bir moda danışmanısın. Kullanıcının isteği: '" + query + "'. " +
                "Lütfen bu isteğe uygun bir ürün arama stratejisi oluştur. " +
                "SADECE şu JSON yapısında cevap ver (kod blokları arasına alma, direkt parantezle başla): " +
                "{ \"search_term\": \"...\", \"style_description\": \"...\", \"color_focus\": \"...\" }";

        return callGemini(prompt);
    }

    @PostMapping("/combine")
    public String getCombination(@RequestBody Map<String, String> request) {
        String productName = request.get("productName");
        String prompt = "Kullanıcı '" + productName + "' ürününü seçti. " +
                "Bu ürüne uygun ayakkabı ve aksesuar öneren 3 parçalık şık bir kombin yap. " +
                "SADECE şu JSON yapısında cevap ver (kod blokları arasına alma): " +
                "{ \"combination\": [ {\"item\": \"...\", \"tip\": \"...\"} ] }";

        return callGemini(prompt);
    }

    private String callGemini(String prompt) {
        String url = GEMINI_URL + apiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", new Object[]{
                        Map.of("parts", new Object[]{
                                Map.of("text", prompt)
                        })
                }
        );

        try {
            String response = restTemplate.postForObject(url, requestBody, String.class);
            // Gemini'ın bazen eklediği ```json ... ``` kısımlarını temizleme (Önemli!)
            if (response != null) {
                response = response.replaceAll("```json", "").replaceAll("```", "").trim();
            }
            return response;
        } catch (Exception e) {
            return "{ \"error\": \"API hatası: " + e.getMessage() + "\" }";
        }
    }
}
