package com.appsmith.server.services;

import com.appsmith.external.constants.AnalyticsEvents;
import com.appsmith.external.models.Policy;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.acl.PolicyGenerator;
import com.appsmith.server.constants.FieldName;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.PermissionGroup;
import com.appsmith.server.domains.QPermissionGroup;
import com.appsmith.server.domains.Tenant;
import com.appsmith.server.domains.User;
import com.appsmith.server.domains.UserGroup;
import com.appsmith.server.domains.Workspace;
import com.appsmith.server.dtos.PermissionGroupInfoDTO;
import com.appsmith.server.exceptions.AppsmithError;
import com.appsmith.server.exceptions.AppsmithException;
import com.appsmith.server.helpers.AppsmithComparators;
import com.appsmith.server.helpers.PermissionGroupUtils;
import com.appsmith.server.helpers.UserUtils;
import com.appsmith.server.repositories.ConfigRepository;
import com.appsmith.server.repositories.PermissionGroupRepository;
import com.appsmith.server.repositories.UserGroupRepository;
import com.appsmith.server.repositories.UserRepository;
import com.appsmith.server.services.ce.PermissionGroupServiceCEImpl;
import com.appsmith.server.solutions.PermissionGroupPermission;
import com.appsmith.server.solutions.PolicySolution;
import com.appsmith.server.solutions.roles.RoleConfigurationSolution;
import com.appsmith.server.solutions.roles.dtos.RoleViewDTO;
import com.mongodb.client.result.UpdateResult;
import jakarta.validation.Validator;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang3.ObjectUtils;
import org.modelmapper.ModelMapper;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Scheduler;
import reactor.util.function.Tuple2;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static com.appsmith.server.acl.AclPermission.ASSIGN_PERMISSION_GROUPS;
import static com.appsmith.server.acl.AclPermission.CREATE_PERMISSION_GROUPS;
import static com.appsmith.server.acl.AclPermission.DELETE_PERMISSION_GROUPS;
import static com.appsmith.server.acl.AclPermission.MANAGE_PERMISSION_GROUPS;
import static com.appsmith.server.acl.AclPermission.READ_PERMISSION_GROUPS;
import static com.appsmith.server.constants.FieldName.EVENT_DATA;
import static com.appsmith.server.constants.FieldName.NUMBER_OF_ASSIGNED_USER_GROUPS;
import static com.appsmith.server.constants.FieldName.NUMBER_OF_UNASSIGNED_USERS;
import static com.appsmith.server.constants.FieldName.NUMBER_OF_UNASSIGNED_USER_GROUPS;
import static com.appsmith.server.repositories.ce.BaseAppsmithRepositoryCEImpl.fieldName;
import static java.lang.Boolean.FALSE;
import static java.lang.Boolean.TRUE;

@Service
@Slf4j
public class PermissionGroupServiceImpl extends PermissionGroupServiceCEImpl implements PermissionGroupService {

    private final ModelMapper modelMapper;
    private final SessionUserService sessionUserService;
    private final TenantService tenantService;
    private final PolicyGenerator policyGenerator;
    private final UserGroupRepository userGroupRepository;
    private final RoleConfigurationSolution roleConfigurationSolution;
    private final PermissionGroupUtils permissionGroupUtils;
    private final UserUtils userUtils;

    public PermissionGroupServiceImpl(
            Scheduler scheduler,
            Validator validator,
            MongoConverter mongoConverter,
            ReactiveMongoTemplate reactiveMongoTemplate,
            PermissionGroupRepository repository,
            AnalyticsService analyticsService,
            SessionUserService sessionUserService,
            TenantService tenantService,
            UserRepository userRepository,
            PolicySolution policySolution,
            ConfigRepository configRepository,
            ModelMapper modelMapper,
            PolicyGenerator policyGenerator,
            UserGroupRepository userGroupRepository,
            RoleConfigurationSolution roleConfigurationSolution,
            PermissionGroupPermission permissionGroupPermission,
            PermissionGroupUtils permissionGroupUtils,
            UserUtils userUtils) {

        super(
                scheduler,
                validator,
                mongoConverter,
                reactiveMongoTemplate,
                repository,
                analyticsService,
                sessionUserService,
                tenantService,
                userRepository,
                policySolution,
                configRepository,
                permissionGroupPermission);
        this.modelMapper = modelMapper;
        this.policyGenerator = policyGenerator;
        this.sessionUserService = sessionUserService;
        this.tenantService = tenantService;
        this.userGroupRepository = userGroupRepository;
        this.roleConfigurationSolution = roleConfigurationSolution;
        this.permissionGroupUtils = permissionGroupUtils;
        this.userUtils = userUtils;
    }

    @Override
    public Mono<List<PermissionGroupInfoDTO>> getAll() {
        return permissionGroupUtils
                .mapToPermissionGroupInfoDto(repository.findAll(READ_PERMISSION_GROUPS))
                .sort(AppsmithComparators.permissionGroupInfoComparator())
                .collectList();
    }

    @Override
    public Mono<List<PermissionGroupInfoDTO>> getAllAssignableRoles() {
        return permissionGroupUtils
                .mapToPermissionGroupInfoDto(repository.findAll(ASSIGN_PERMISSION_GROUPS))
                .collectList();
    }

    @Override
    public Mono<PermissionGroup> findById(String id, AclPermission permission) {
        return repository.findById(id, permission);
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToGroupIdsIn(Set<String> groupIds) {
        return repository.findAllByAssignedToGroupIdsIn(groupIds).flatMap(repository::setUserPermissionsInObject);
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToGroupId(String groupId) {
        return findAllByAssignedToGroupIdsIn(Set.of(groupId));
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToUsersIn(Set<String> userIds) {
        return repository.findAllByAssignedToUserIds(userIds, READ_PERMISSION_GROUPS);
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToUserId(String userId) {
        return findAllByAssignedToUsersIn(Set.of(userId));
    }

    @Override
    public Mono<PermissionGroup> create(PermissionGroup permissionGroup) {
        Mono<Boolean> isCreateAllowedMono = Mono.zip(
                        sessionUserService.getCurrentUser(), tenantService.getDefaultTenantId())
                .flatMap(tuple -> {
                    User user = tuple.getT1();
                    String defaultTenantId = tuple.getT2();

                    if (user.getTenantId() != null) {
                        defaultTenantId = user.getTenantId();
                    }

                    return tenantService.findById(defaultTenantId, CREATE_PERMISSION_GROUPS);
                })
                .map(tenant -> TRUE)
                .switchIfEmpty(Mono.just(FALSE));

        if (permissionGroup.getId() != null) {
            return Mono.error(new AppsmithException(AppsmithError.INVALID_PARAMETER, FieldName.ID));
        }

        Mono<PermissionGroup> userPermissionGroupMono = isCreateAllowedMono.flatMap(isCreateAllowed -> {
            if (!isCreateAllowed && permissionGroup.getDefaultDomainType() == null) {
                // Throw an error if the user is not allowed to create a permission group. If default workspace id
                // is set, this permission group is system generated and hence shouldn't error out.
                return Mono.error(new AppsmithException(AppsmithError.ACTION_IS_NOT_AUTHORIZED, "Create Role"));
            }

            return Mono.just(permissionGroup);
        });
        Mono<PermissionGroup> createdPermissionMono = Mono.zip(
                        userPermissionGroupMono, tenantService.getDefaultTenant())
                .flatMap(tuple -> {
                    PermissionGroup userPermissionGroup = tuple.getT1();
                    Tenant defaultTenant = tuple.getT2();
                    userPermissionGroup.setTenantId(defaultTenant.getId());

                    userPermissionGroup = generateAndSetPermissionGroupPolicies(defaultTenant, userPermissionGroup);

                    return super.create(userPermissionGroup);
                })
                .cache();

        // make the default workspace roles uneditable
        Mono<PermissionGroup> ifDefaultPgMakeUneditableMono = createdPermissionMono
                .flatMap(pg -> Mono.zip(Mono.just(pg), permissionGroupUtils.isAutoCreated(pg)))
                .flatMap(tuple -> {
                    PermissionGroup permissionGroup1 = tuple.getT1();
                    // If isAutoCreated is TRUE, it's a default document role and hence shouldn't be editable or
                    // deletable
                    if (tuple.getT2()) {
                        Set<Policy> policiesWithoutEditPermission = permissionGroup1.getPolicies().stream()
                                .filter(policy -> !policy.getPermission().equals(MANAGE_PERMISSION_GROUPS.getValue())
                                        && !policy.getPermission().equals(DELETE_PERMISSION_GROUPS.getValue()))
                                .collect(Collectors.toSet());
                        permissionGroup1.setPolicies(policiesWithoutEditPermission);
                        return repository.save(permissionGroup1);
                    } else {
                        // If this is not a default created role, then return the role as is from the DB
                        return repository.findById(permissionGroup1.getId(), READ_PERMISSION_GROUPS);
                    }
                });

        // Clean cache for Users who are assigned to Permission Groups DIRECTLY OR INDIRECTLY(via User Groups)
        // for all the Permission Groups who have READ ACCESS on the newly created Permission Group.
        Mono<Void> cleanUserPermissionGroupMono = createdPermissionMono.flatMap(permissionGroup1 -> {
            Set<String> permissionGroupIdsWithReadAccess = permissionGroup1.getPolicies().stream()
                    .filter(policy -> policy.getPermission().equals(READ_PERMISSION_GROUPS.getValue()))
                    .findFirst()
                    .map(Policy::getPermissionGroups)
                    .orElse(Set.of());
            return repository
                    .findAllById(permissionGroupIdsWithReadAccess)
                    .flatMap(this::getAllDirectlyAndIndirectlyAssignedUserIds)
                    .collectList()
                    .map(userIdSetList -> {
                        Set<String> userIdSet = new HashSet<>();
                        userIdSetList.forEach(userIds -> userIdSet.addAll(userIds));
                        return userIdSet;
                    })
                    .flatMap(userIdsSet -> cleanPermissionGroupCacheForUsers(
                            userIdsSet.stream().toList()));
        });

        return Mono.zip(ifDefaultPgMakeUneditableMono, cleanUserPermissionGroupMono.thenReturn(TRUE))
                .map(Tuple2::getT1);
    }

    private PermissionGroup generateAndSetPermissionGroupPolicies(Tenant tenant, PermissionGroup permissionGroup) {
        Set<Policy> policies =
                policyGenerator.getAllChildPolicies(tenant.getPolicies(), Tenant.class, PermissionGroup.class);
        permissionGroup.setPolicies(policies);
        return permissionGroup;
    }

    @Override
    public Mono<PermissionGroup> archiveById(String id) {
        Mono<PermissionGroup> permissionGroupMono = repository
                .findById(id, DELETE_PERMISSION_GROUPS)
                .switchIfEmpty(Mono.error(new AppsmithException(AppsmithError.UNAUTHORIZED_ACCESS)))
                .cache();
        // Clean cache for Users who are assigned to Permission Groups DIRECTLY OR INDIRECTLY(via User Groups)
        // for all the Permission Groups who have READ ACCESS on the newly created Permission Group.
        Mono<Void> cleanUserPermissionGroupMono = permissionGroupMono.flatMap(permissionGroup1 -> {
            Set<String> permissionGroupIdsWithReadAccess = permissionGroup1.getPolicies().stream()
                    .filter(policy -> policy.getPermission().equals(READ_PERMISSION_GROUPS.getValue()))
                    .findFirst()
                    .map(Policy::getPermissionGroups)
                    .orElse(Set.of());
            return repository
                    .findAllById(permissionGroupIdsWithReadAccess)
                    .flatMap(this::getAllDirectlyAndIndirectlyAssignedUserIds)
                    .collectList()
                    .map(userIdSetList -> {
                        Set<String> userIdSet = new HashSet<>();
                        userIdSetList.forEach(userIds -> userIdSet.addAll(userIds));
                        return userIdSet;
                    })
                    .flatMap(userIdsSet -> cleanPermissionGroupCacheForUsers(
                            userIdsSet.stream().toList()));
        });

        // TODO : Untested : Please test.
        return permissionGroupMono
                .flatMap(permissionGroup -> {
                    return Mono.zip(
                                    bulkUnassignUsersFromPermissionGroupsWithoutPermission(
                                            permissionGroup.getAssignedToUserIds(), Set.of(id)),
                                    bulkUnassignFromUserGroupsWithoutPermission(
                                            permissionGroup, permissionGroup.getAssignedToGroupIds()),
                                    cleanUserPermissionGroupMono.thenReturn(TRUE))
                            .then(repository.archiveById(id));
                })
                .then(permissionGroupMono.flatMap(analyticsService::sendDeleteEvent));
    }

    @Override
    public Mono<PermissionGroup> bulkUnassignFromUserGroupsWithoutPermission(
            PermissionGroup permissionGroup, Set<String> userGroupIds) {

        return userGroupRepository
                .findAllById(userGroupIds)
                .collect(Collectors.toSet())
                .flatMap(userGroups -> {
                    Set<String> assignedToGroupIds = permissionGroup.getAssignedToGroupIds();
                    assignedToGroupIds.removeAll(userGroupIds);

                    // Get the userIds from all the user groups that we are unassigning
                    List<String> userIds = userGroups.stream()
                            .map(ug -> ug.getUsers())
                            .flatMap(Collection::stream)
                            .collect(Collectors.toList());

                    Update updateObj = new Update();
                    String path = fieldName(QPermissionGroup.permissionGroup.assignedToGroupIds);

                    updateObj.set(path, assignedToGroupIds);
                    return Mono.zip(
                                    repository.updateById(permissionGroup.getId(), updateObj),
                                    cleanPermissionGroupCacheForUsers(userIds).thenReturn(TRUE))
                            .then(repository.findById(permissionGroup.getId()));
                });
    }

    @Override
    public Mono<PermissionGroup> bulkUnassignFromUserGroups(
            PermissionGroup permissionGroup, Set<UserGroup> userGroups) {
        ensureAssignedToUserGroups(permissionGroup);

        // Get the userIds from all the user groups that we are unassigning
        List<String> userIds = userGroups.stream()
                .map(ug -> ug.getUsers())
                .flatMap(Collection::stream)
                .collect(Collectors.toList());

        // Remove the user groups from the permission group
        List<String> userGroupIds = userGroups.stream().map(UserGroup::getId).collect(Collectors.toList());
        userGroupIds.forEach(permissionGroup.getAssignedToGroupIds()::remove);

        return Mono.zip(
                        repository.updateById(
                                permissionGroup.getId(), permissionGroup, AclPermission.UNASSIGN_PERMISSION_GROUPS),
                        cleanPermissionGroupCacheForUsers(userIds).thenReturn(TRUE))
                .map(tuple -> tuple.getT1());
    }

    @Override
    public Mono<RoleViewDTO> findConfigurableRoleById(String id) {
        // The user should have atleast READ_PERMISSION_GROUPS permission to view the role. The edits would be allowed
        // via
        // MANAGE_PERMISSION_GROUPS permission.
        return repository
                .findById(id, READ_PERMISSION_GROUPS)
                .switchIfEmpty(Mono.error(new AppsmithException(AppsmithError.UNAUTHORIZED_ACCESS)))
                .flatMap(permissionGroup -> roleConfigurationSolution
                        .getAllTabViews(permissionGroup.getId())
                        .map(roleViewDTO -> {
                            roleViewDTO.setId(permissionGroup.getId());
                            roleViewDTO.setName(permissionGroup.getName());
                            roleViewDTO.setDescription(permissionGroup.getDescription());
                            roleViewDTO.setUserPermissions(permissionGroup.getUserPermissions());
                            return roleViewDTO;
                        }));
    }

    public Mono<PermissionGroupInfoDTO> updatePermissionGroup(String id, PermissionGroup resource) {
        return repository
                .findById(id, MANAGE_PERMISSION_GROUPS)
                .switchIfEmpty(Mono.error(new AppsmithException(AppsmithError.ACTION_IS_NOT_AUTHORIZED, "update role")))
                .zipWith(userUtils.getDefaultUserPermissionGroup())
                .flatMap(tuple -> {
                    PermissionGroup permissionGroup = tuple.getT1();
                    PermissionGroup defaultUserRole = tuple.getT2();

                    if (id.equals(defaultUserRole.getId())) {
                        return Mono.error(new AppsmithException(AppsmithError.ACTION_IS_NOT_AUTHORIZED, "update role"));
                    }
                    // The update API is only supposed to update the NAME and DESCRIPTION of the Permission Group.
                    // ANY OTHER FIELD SHOULD NOT BE UPDATED USING THIS FUNCTION.
                    permissionGroup.setName(resource.getName());
                    permissionGroup.setDescription(resource.getDescription());
                    return super.update(id, permissionGroup);
                })
                .map(savedPermissionGroup -> modelMapper.map(savedPermissionGroup, PermissionGroupInfoDTO.class));
    }

    @Override
    public Mono<RoleViewDTO> createCustomPermissionGroup(PermissionGroup permissionGroup) {
        return this.create(permissionGroup)
                .flatMap(analyticsService::sendCreateEvent)
                .flatMap(createdPermissionGroup -> this.findConfigurableRoleById(createdPermissionGroup.getId()));
    }

    @Override
    public Mono<Boolean> bulkUnassignUserFromPermissionGroupsWithoutPermission(
            User user, Set<String> permissionGroupIds) {
        return repository
                .findAllById(permissionGroupIds)
                .flatMap(pg -> {
                    Set<String> assignedToUserIds = pg.getAssignedToUserIds();
                    assignedToUserIds.remove(user.getId());

                    Update updateObj = new Update();
                    String path = fieldName(QPermissionGroup.permissionGroup.assignedToUserIds);

                    updateObj.set(path, assignedToUserIds);
                    return repository.updateById(pg.getId(), updateObj).then(Mono.defer(() -> {
                        Map<String, Object> eventData =
                                Map.of(FieldName.UNASSIGNED_USERS_FROM_PERMISSION_GROUPS, List.of(user.getUsername()));
                        AnalyticsEvents unassignedEvent = AnalyticsEvents.UNASSIGNED_USERS_FROM_PERMISSION_GROUP;
                        Map<String, Object> analyticalProperties = Map.of(
                                NUMBER_OF_UNASSIGNED_USERS,
                                1,
                                NUMBER_OF_UNASSIGNED_USER_GROUPS,
                                0,
                                EVENT_DATA,
                                eventData);
                        return analyticsService.sendObjectEvent(unassignedEvent, pg, analyticalProperties);
                    }));
                })
                .then(Mono.just(TRUE));
    }

    @Override
    public Flux<PermissionGroup> getAllByAssignedToUserGroupAndDefaultWorkspace(
            UserGroup userGroup, Workspace defaultWorkspace, AclPermission aclPermission) {
        return repository.findAllByAssignedToUserGroupIdAndDefaultWorkspaceId(
                userGroup.getId(), defaultWorkspace.getId(), aclPermission);
    }

    @Override
    public Mono<PermissionGroup> unassignFromUserGroup(PermissionGroup permissionGroup, UserGroup userGroup) {
        return bulkUnassignFromUserGroups(permissionGroup, Set.of(userGroup));
    }

    @Override
    public Mono<PermissionGroup> assignToUserGroup(PermissionGroup permissionGroup, UserGroup userGroup) {
        return this.bulkAssignToUserGroups(permissionGroup, Set.of(userGroup));
    }

    public Mono<PermissionGroup> bulkAssignToUserGroups(PermissionGroup permissionGroup, Set<UserGroup> userGroups) {
        ensureAssignedToUserGroups(permissionGroup);
        // Get the userIds from all the user groups that we are unassigning
        List<String> userIds = userGroups.stream()
                .map(ug -> ug.getUsers())
                .flatMap(Collection::stream)
                .collect(Collectors.toList());
        List<String> userGroupIds = userGroups.stream().map(UserGroup::getId).collect(Collectors.toList());
        permissionGroup.getAssignedToGroupIds().addAll(userGroupIds);
        Mono<PermissionGroup> permissionGroupUpdateMono = repository
                .updateById(permissionGroup.getId(), permissionGroup, ASSIGN_PERMISSION_GROUPS)
                .switchIfEmpty(Mono.error(new AppsmithException(AppsmithError.ACL_NO_RESOURCE_FOUND)));

        return Mono.zip(
                        permissionGroupUpdateMono,
                        cleanPermissionGroupCacheForUsers(userIds).thenReturn(TRUE))
                .map(tuple -> tuple.getT1());
    }

    @Override
    public Mono<Boolean> bulkAssignToUsersWithoutPermission(PermissionGroup pg, List<User> users) {
        ensureAssignedToUserIds(pg);
        List<String> userIds = users.stream().map(User::getId).collect(Collectors.toList());
        Update updateAssignedToUserIdsUpdate = new Update();
        updateAssignedToUserIdsUpdate
                .addToSet(fieldName(QPermissionGroup.permissionGroup.assignedToUserIds))
                .each(userIds.toArray());

        Mono<UpdateResult> permissionGroupUpdateMono = repository.updateById(pg.getId(), updateAssignedToUserIdsUpdate);

        return Mono.zip(
                        permissionGroupUpdateMono,
                        cleanPermissionGroupCacheForUsers(userIds).thenReturn(TRUE))
                .thenReturn(TRUE);
    }

    public Mono<Set<String>> getSessionUserPermissionGroupIds() {
        return sessionUserService.getCurrentUser().flatMap(repository::getAllPermissionGroupsIdsForUser);
    }

    @Override
    public Mono<Set<String>> getAllDirectlyAndIndirectlyAssignedUserIds(PermissionGroup permissionGroup) {
        if (ObjectUtils.isEmpty(permissionGroup.getAssignedToGroupIds())
                && ObjectUtils.isEmpty(permissionGroup.getAssignedToUserIds())) {
            return Mono.just(Set.of());
        }
        Set<String> directAssignedUserIds = ObjectUtils.isEmpty(permissionGroup.getAssignedToUserIds())
                ? Set.of()
                : permissionGroup.getAssignedToUserIds();

        if (ObjectUtils.isNotEmpty(permissionGroup.getAssignedToGroupIds())) {
            return userGroupRepository
                    .findAllById(permissionGroup.getAssignedToGroupIds())
                    .collectList()
                    .map(userGroupList -> userGroupList.stream()
                            .map(UserGroup::getUsers)
                            .flatMap(Collection::stream)
                            .collect(Collectors.toSet()))
                    .map(indirectAssignedUserIds -> {
                        indirectAssignedUserIds.addAll(directAssignedUserIds);
                        return indirectAssignedUserIds;
                    });
        }
        return Mono.just(directAssignedUserIds);
    }

    @Override
    public Mono<Void> deleteWithoutPermission(String id) {
        Mono<Void> deleteRoleMono = super.deleteWithoutPermission(id).cache();
        Mono<PermissionGroup> roleMono = repository.findById(id);
        /*
         * bulkUnassignFromUserGroupsWithoutPermission is being used here, because in addition to unassigning user
         * groups, it will clean cache for users who have access to this role, via user group.
         */
        return roleMono.flatMap(role -> bulkUnassignFromUserGroupsWithoutPermission(role, role.getAssignedToGroupIds()))
                .then(deleteRoleMono);
    }

    @Override
    public Flux<PermissionGroup> getAllDefaultRolesForApplication(
            Application application, Optional<AclPermission> aclPermission) {
        return repository.findByDefaultApplicationId(application.getId(), aclPermission);
    }

    private Mono<PermissionGroup> sendAssignedToPermissionGroupEvent(
            PermissionGroup permissionGroup, List<String> usernames, List<String> userGroupNames) {
        Mono<PermissionGroup> sendAssignedUsersToPermissionGroupEvent =
                sendEventUsersAssociatedToRole(permissionGroup, usernames);
        Mono<PermissionGroup> sendAssignedUserGroupsTpPermissionGroupEvent =
                sendEventUserGroupsAssociatedToRole(permissionGroup, userGroupNames);
        return Mono.when(sendAssignedUsersToPermissionGroupEvent, sendAssignedUserGroupsTpPermissionGroupEvent)
                .thenReturn(permissionGroup);
    }

    @Override
    public Mono<PermissionGroup> bulkAssignToUsersAndGroups(
            PermissionGroup role, List<User> users, List<UserGroup> groups) {
        ensureAssignedToUserIds(role);
        ensureAssignedToUserGroups(role);

        List<String> userIds = users.stream().map(User::getId).toList();
        List<String> groupIds = groups.stream().map(UserGroup::getId).toList();
        role.getAssignedToUserIds().addAll(userIds);
        role.getAssignedToGroupIds().addAll(groupIds);
        List<String> usernames = users.stream().map(User::getUsername).collect(Collectors.toList());
        List<String> userGroupNames = groups.stream().map(UserGroup::getName).collect(Collectors.toList());
        Mono<PermissionGroup> updatedRoleMono = repository
                .updateById(role.getId(), role, AclPermission.ASSIGN_PERMISSION_GROUPS)
                .switchIfEmpty(Mono.error(new AppsmithException(AppsmithError.ACL_NO_RESOURCE_FOUND)))
                .cache();

        Mono<PermissionGroup> updateEventGetRoleMono = updatedRoleMono.flatMap(
                permissionGroup1 -> sendAssignedToPermissionGroupEvent(permissionGroup1, usernames, userGroupNames));

        Mono<Boolean> cleanCacheForAllUsersAssignedDirectlyIndirectly = updatedRoleMono.flatMap(updatedRole -> {
            List<String> usersIdsInGroups = groups.stream()
                    .map(UserGroup::getUsers)
                    .flatMap(Collection::stream)
                    .toList();
            List<String> userIdsForCacheCleaning = new ArrayList<>();
            userIdsForCacheCleaning.addAll(userIds);
            userIdsForCacheCleaning.addAll(usersIdsInGroups);
            return cleanPermissionGroupCacheForUsers(userIdsForCacheCleaning).thenReturn(TRUE);
        });

        return cleanCacheForAllUsersAssignedDirectlyIndirectly
                .then(updateEventGetRoleMono)
                .then(updatedRoleMono);
    }

    protected Mono<PermissionGroup> sendEventUserGroupsAssociatedToRole(
            PermissionGroup permissionGroup, List<String> groupNames) {
        Mono<PermissionGroup> sendAssignedUsersToPermissionGroupEvent = Mono.just(permissionGroup);
        if (CollectionUtils.isNotEmpty(groupNames)) {
            Map<String, Object> eventData = Map.of(FieldName.ASSIGNED_USER_GROUPS_TO_PERMISSION_GROUPS, groupNames);
            Map<String, Object> extraPropsForCloudHostedInstance =
                    Map.of(FieldName.ASSIGNED_USER_GROUPS_TO_PERMISSION_GROUPS, groupNames);
            Map<String, Object> analyticsProperties = Map.of(
                    NUMBER_OF_ASSIGNED_USER_GROUPS,
                    groupNames.size(),
                    FieldName.EVENT_DATA,
                    eventData,
                    FieldName.CLOUD_HOSTED_EXTRA_PROPS,
                    extraPropsForCloudHostedInstance);
            sendAssignedUsersToPermissionGroupEvent = analyticsService.sendObjectEvent(
                    AnalyticsEvents.ASSIGNED_USER_GROUPS_TO_PERMISSION_GROUP, permissionGroup, analyticsProperties);
        }
        return sendAssignedUsersToPermissionGroupEvent;
    }

    protected Mono<PermissionGroup> sendEventUserGroupsRemovedFromRole(
            PermissionGroup permissionGroup, List<String> groupNames) {
        Mono<PermissionGroup> sendUnAssignedUsersToPermissionGroupEvent = Mono.just(permissionGroup);
        if (CollectionUtils.isNotEmpty(groupNames)) {
            Map<String, Object> eventData = Map.of(FieldName.UNASSIGNED_USER_GROUPS_FROM_PERMISSION_GROUPS, groupNames);
            Map<String, Object> extraPropsForCloudHostedInstance =
                    Map.of(FieldName.UNASSIGNED_USER_GROUPS_FROM_PERMISSION_GROUPS, groupNames);
            Map<String, Object> analyticsProperties = Map.of(
                    NUMBER_OF_UNASSIGNED_USER_GROUPS,
                    groupNames.size(),
                    FieldName.EVENT_DATA,
                    eventData,
                    FieldName.CLOUD_HOSTED_EXTRA_PROPS,
                    extraPropsForCloudHostedInstance);
            sendUnAssignedUsersToPermissionGroupEvent = analyticsService.sendObjectEvent(
                    AnalyticsEvents.UNASSIGNED_USER_GROUPS_FROM_PERMISSION_GROUP, permissionGroup, analyticsProperties);
        }
        return sendUnAssignedUsersToPermissionGroupEvent;
    }

    @Override
    public Mono<PermissionGroup> assignToUserGroupAndSendEvent(PermissionGroup permissionGroup, UserGroup userGroup) {
        return bulkAssignToUserGroupsAndSendEvent(permissionGroup, Set.of(userGroup));
    }

    @Override
    public Mono<PermissionGroup> bulkAssignToUserGroupsAndSendEvent(
            PermissionGroup permissionGroup, Set<UserGroup> userGroups) {
        List<String> groupNames = userGroups.stream().map(UserGroup::getName).toList();
        return bulkAssignToUserGroups(permissionGroup, userGroups)
                .flatMap(permissionGroup1 -> sendEventUserGroupsAssociatedToRole(permissionGroup1, groupNames));
    }

    @Override
    public Mono<PermissionGroup> unAssignFromUserGroupAndSendEvent(
            PermissionGroup permissionGroup, UserGroup userGroup) {
        return bulkUnAssignFromUserGroupsAndSendEvent(permissionGroup, Set.of(userGroup));
    }

    @Override
    public Mono<PermissionGroup> bulkUnAssignFromUserGroupsAndSendEvent(
            PermissionGroup permissionGroup, Set<UserGroup> userGroups) {
        List<String> groupNames = userGroups.stream().map(UserGroup::getName).toList();
        return bulkUnassignFromUserGroups(permissionGroup, userGroups)
                .flatMap(permissionGroup1 -> sendEventUserGroupsRemovedFromRole(permissionGroup1, groupNames));
    }

    /**
     * The method will get all the roles assigned to user.
     * Here, we have added a filter to remove the User Management roles, because it is internal
     * to Appsmith, and should not be shown to users.
     * @param userIds
     * @return
     */
    @Override
    public Flux<String> getRoleNamesAssignedToUserIds(Set<String> userIds) {
        List<String> includeFields = List.of(
                fieldName(QPermissionGroup.permissionGroup.name), fieldName(QPermissionGroup.permissionGroup.policies));
        return repository
                .findAllByAssignedToUserIn(userIds, Optional.of(includeFields), Optional.empty())
                .filter(role -> !PermissionGroupUtils.isUserManagementRole(role))
                .map(PermissionGroup::getName);
    }

    @Override
    public Mono<Boolean> bulkUnAssignUsersAndUserGroupsFromPermissionGroupsWithoutPermission(
            List<User> users, List<UserGroup> groups, List<PermissionGroup> roles) {
        Set<String> userIds = users.stream().map(User::getId).collect(Collectors.toSet());
        Set<String> groupIds = groups.stream().map(UserGroup::getId).collect(Collectors.toSet());
        roles.forEach(role -> {
            role.getAssignedToUserIds().removeAll(userIds);
            role.getAssignedToGroupIds().removeAll(groupIds);
        });
        Mono<List<UpdateResult>> updateRolesMono = Flux.fromIterable(roles)
                .flatMap(role -> {
                    Update update = new Update();
                    update.set(
                            fieldName(QPermissionGroup.permissionGroup.assignedToUserIds), role.getAssignedToUserIds());
                    update.set(
                            fieldName(QPermissionGroup.permissionGroup.assignedToGroupIds),
                            role.getAssignedToGroupIds());
                    return repository.updateById(role.getId(), update);
                })
                .collectList();

        List<String> userIdsForClearingCache = new ArrayList<>(groups.stream()
                .map(UserGroup::getUsers)
                .flatMap(Collection::stream)
                .toList());
        userIdsForClearingCache.addAll(userIds);
        Mono<Boolean> clearCacheForUsers =
                cleanPermissionGroupCacheForUsers(userIdsForClearingCache).thenReturn(TRUE);
        return Mono.zip(updateRolesMono, clearCacheForUsers).map(pair -> TRUE);
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToUserIdsInWithoutPermission(Set<String> userIds) {
        return repository.findAllByAssignedToUserIds(userIds, Optional.empty(), Optional.empty());
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToGroupIdsInWithoutPermission(Set<String> groupIds) {
        return repository.findAllByAssignedToGroupIds(groupIds, Optional.empty(), Optional.empty());
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToUserIdWithoutPermission(String userId) {
        return findAllByAssignedToUserIdsInWithoutPermission(Set.of(userId));
    }

    @Override
    public Flux<PermissionGroup> findAllByAssignedToGroupIdWithoutPermission(String groupId) {
        return findAllByAssignedToGroupIdsInWithoutPermission(Set.of(groupId));
    }
}
