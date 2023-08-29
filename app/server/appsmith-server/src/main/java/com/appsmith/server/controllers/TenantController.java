package com.appsmith.server.controllers;

import com.appsmith.server.constants.Url;
import com.appsmith.server.controllers.ce.TenantControllerCE;
import com.appsmith.server.domains.Tenant;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.dtos.UpdateLicenseKeyDTO;
import com.appsmith.server.services.TenantService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.multipart.Part;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@RestController
@Slf4j
@RequestMapping(Url.TENANT_URL)
public class TenantController extends TenantControllerCE {

    private final TenantService service;

    public TenantController(TenantService service) {
        super(service);
        this.service = service;
    }

    @PutMapping("license")
    public Mono<ResponseDTO<Tenant>> updateTenantLicenseKey(@RequestBody UpdateLicenseKeyDTO updateLicenseKeyDTO) {
        return service.updateTenantLicenseKey(updateLicenseKeyDTO)
                .map(tenant -> new ResponseDTO<>(HttpStatus.OK.value(), tenant, null));
    }

    @PostMapping("license")
    public Mono<ResponseDTO<String>> activateTenantAndGetRedirectUrl(
            @RequestBody UpdateLicenseKeyDTO updateLicenseKeyDTO, ServerWebExchange exchange) {
        return service.activateTenantAndGetRedirectUrl(updateLicenseKeyDTO, exchange)
                .map(tenant -> new ResponseDTO<>(HttpStatus.OK.value(), tenant, null));
    }

    /**
     * API to refresh the current license status from the Cloud Services and return the latest status
     * @return Mono of ResponseDTO of Tenant
     */
    @GetMapping("license")
    public Mono<ResponseDTO<Tenant>> getLicense() {
        return service.refreshAndGetCurrentLicense()
                .map(tenant -> new ResponseDTO<>(HttpStatus.OK.value(), tenant, null));
    }

    @PutMapping(value = "", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Mono<ResponseDTO<Tenant>> updateTenantConfiguration(
            @RequestPart(value = "tenantConfig", required = false) Mono<String> tenantConfigAsString,
            @RequestPart(value = "brandLogo", required = false) Mono<Part> brandLogoMono,
            @RequestPart(value = "brandFavicon", required = false) Mono<Part> brandFaviconMono) {
        log.info("Updating Tenant configuration via form data");
        return service.updateDefaultTenantConfiguration(tenantConfigAsString, brandLogoMono, brandFaviconMono)
                .map(tenant -> new ResponseDTO<>(HttpStatus.OK.value(), tenant, null));
    }

    @DeleteMapping("license")
    public Mono<ResponseDTO<Tenant>> removeLicenseKey() {
        return service.removeLicenseKey().map(tenant -> new ResponseDTO<>(HttpStatus.OK.value(), tenant, null));
    }

    @PutMapping("license/sync-plan")
    public Mono<ResponseDTO<Tenant>> syncLicensePlans() {
        return service.syncLicensePlans().map(tenant -> new ResponseDTO<>(HttpStatus.OK.value(), tenant, null));
    }
}
