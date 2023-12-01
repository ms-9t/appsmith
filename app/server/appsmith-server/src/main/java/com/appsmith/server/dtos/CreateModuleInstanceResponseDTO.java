package com.appsmith.server.dtos;

import com.appsmith.external.models.ModuleInstanceDTO;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class CreateModuleInstanceResponseDTO {
    ModuleInstanceDTO moduleInstance;
    ModuleInstanceEntitiesDTO entities;
}