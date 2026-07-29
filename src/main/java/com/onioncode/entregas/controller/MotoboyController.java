package com.onioncode.entregas.controller;

import com.onioncode.entregas.dto.DeleteMotoboyDTO;
import com.onioncode.entregas.dto.MotoboyMasterResponseDTO;
import com.onioncode.entregas.dto.MotoboyRequestDTO;
import com.onioncode.entregas.dto.MotoboyResponseDTO;
import com.onioncode.entregas.dto.PageResponseDTO;
import com.onioncode.entregas.dto.UpdateMotoboyDTO;
import com.onioncode.entregas.service.MotoboyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/motoboys")
public class MotoboyController {

    private final MotoboyService service;

    public MotoboyController(MotoboyService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<MotoboyResponseDTO> save(@RequestBody @Valid MotoboyRequestDTO dto, Authentication auth){
        return ResponseEntity.ok(service.save(dto, auth));
    }

    @GetMapping
    public ResponseEntity<List<MotoboyResponseDTO>> findAll(Authentication auth){
        return ResponseEntity.status(HttpStatus.OK).body(service.findAllMotoboy(auth));
    }

    @GetMapping("/pagina")
    public ResponseEntity<PageResponseDTO<MotoboyResponseDTO>> findAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth){
        return ResponseEntity.status(HttpStatus.OK).body(service.findAllMotoboyPaged(auth, page, size));
    }

    @PreAuthorize("hasRole('MASTER')")
    @GetMapping("/findAll")
    public ResponseEntity<PageResponseDTO<MotoboyMasterResponseDTO>> findAllMaster(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String nome,
            Authentication authentication){
        return ResponseEntity.status(HttpStatus.OK).body(service.findAllMotoboyMaster(authentication, page, size, nome));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MotoboyResponseDTO> findById(@PathVariable String id, Authentication auth){
        return ResponseEntity.ok(service.findById(id, auth));
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam String id, @RequestBody @Valid DeleteMotoboyDTO dto,
                                        Authentication authentication){
        service.delete(id, dto.getPassword(), authentication);
        return ResponseEntity.noContent().build();
    }

    @PutMapping
    public ResponseEntity<MotoboyResponseDTO> update(@RequestBody @Valid UpdateMotoboyDTO dto,
                                                     Authentication authentication){
        return ResponseEntity.ok(service.update(dto, authentication));
    }

}
