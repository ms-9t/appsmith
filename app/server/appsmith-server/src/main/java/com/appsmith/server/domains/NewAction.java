package com.appsmith.server.domains;

import com.appsmith.server.domains.ce.NewActionCE;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@NoArgsConstructor
@Entity
public class NewAction extends NewActionCE {}
