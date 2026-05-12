package com.shoppingai.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    // Bu nesne, bizim yerimize Google/Gemini API'sine istek atacak araçtır.
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}