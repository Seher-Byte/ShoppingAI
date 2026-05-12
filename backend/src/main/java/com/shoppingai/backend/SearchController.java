package com.shoppingai.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@RestController
@RequestMapping("/api/search")
@CrossOrigin(origins = "*") // Frontend'in (5173 portu) buraya erişebilmesi için şart!
public class SearchController {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public SearchController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostMapping("/analyze")
    public ResponseEntity<Map> analyze(@RequestBody Map<String, String> request) {
        String userQuery = request.get("query");
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

        // Gemini'a "Bana arama terimi ver" diyoruz
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text",
                        "Sen akıllı bir alışveriş asistanısın. Kullanıcının şu isteğini e-ticaret siteleri için optimize edilmiş 'aranacak kelimelere' dönüştür. Sadece kelimeleri aralarına + koyarak tek satırda yaz. Örnek: erkek+siyah+deri+ceket. İstek: " + userQuery))))
        );

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, new HttpEntity<>(body), Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Gemini bağlantı hatası!"));
        }
    }
}
