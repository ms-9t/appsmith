package com.appsmith.server.domains;

import com.appsmith.external.models.BaseDomain;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashSet;
import java.util.Set;

@Document
@NoArgsConstructor
@Data
public class UserGroup extends BaseDomain {

    @NotNull private String name;

    private String description;

    String tenantId;

    Boolean isProvisioned = false;

    /*
    TODO: Ideally, the client should NOT set this field when creating or updating the user groups. Users will be added to
     user groups through the /invite API
    */
    private Set<String> users = new HashSet<>();
}
