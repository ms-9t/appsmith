package com.appsmith.server.services;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.domains.User;
import com.appsmith.server.domains.UserGroup;
import com.appsmith.server.dtos.PagedDomain;
import com.appsmith.server.dtos.ProvisionResourceDto;
import com.appsmith.server.dtos.UpdateGroupMembershipDTO;
import com.appsmith.server.dtos.UserGroupCompactDTO;
import com.appsmith.server.dtos.UserGroupDTO;
import com.appsmith.server.dtos.UserGroupUpdateDTO;
import com.appsmith.server.dtos.UsersForGroupDTO;
import org.springframework.util.MultiValueMap;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Set;

public interface UserGroupService extends CrudService<UserGroup, String> {

    Mono<UserGroupDTO> createGroup(UserGroup userGroup);

    Mono<List<UserGroupDTO>> removeUsers(UsersForGroupDTO removeUsersFromGroupDTO);

    Mono<UserGroup> findById(String id, AclPermission permission);

    Mono<UserGroupDTO> updateGroup(String id, UserGroup resource);

    Mono<UserGroupDTO> getGroupById(String id);

    Mono<List<UserGroupDTO>> inviteUsers(UsersForGroupDTO inviteUsersToGroupDTO, String originHeader);

    Mono<List<UserGroupCompactDTO>> getAllWithAddUserPermission();

    Mono<List<UserGroupCompactDTO>> getAllReadableGroups();

    Mono<List<UserGroupDTO>> changeGroupsForUser(
            UpdateGroupMembershipDTO updateGroupMembershipDTO, String originHeader);

    Flux<UserGroupCompactDTO> findAllGroupsForUser(String userId);

    Mono<Boolean> bulkRemoveUserFromGroupsWithoutPermission(User user, Set<String> groupIds);

    Mono<ProvisionResourceDto> updateProvisionGroup(String id, UserGroupUpdateDTO resource);

    Mono<ProvisionResourceDto> getProvisionGroup(String groupId);

    Mono<PagedDomain<ProvisionResourceDto>> getProvisionGroups(MultiValueMap<String, String> queryParams);

    Mono<ProvisionResourceDto> createProvisionGroup(UserGroup userGroup);

    Mono<List<UserGroupDTO>> removeUsersFromProvisionGroup(UsersForGroupDTO removeUsersFromGroupDTO);

    Mono<List<UserGroupDTO>> addUsersToProvisionGroup(UsersForGroupDTO addUsersFromGroupDTO);
}