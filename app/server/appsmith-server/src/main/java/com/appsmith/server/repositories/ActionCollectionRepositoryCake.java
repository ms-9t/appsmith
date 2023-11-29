package com.appsmith.server.repositories;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.domains.*;
import com.appsmith.external.models.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.data.domain.Sort;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import org.springframework.data.mongodb.core.query.*;
import com.mongodb.bulk.BulkWriteResult;
import com.mongodb.client.result.InsertManyResult;
import com.querydsl.core.types.dsl.StringPath;
import com.mongodb.client.result.UpdateResult;

import java.util.*;

@Component
@RequiredArgsConstructor
public class ActionCollectionRepositoryCake {
    private final ActionCollectionRepository repository;

    // From CrudRepository
    public Mono<ActionCollection> save(ActionCollection entity) {
        return Mono.justOrEmpty(repository.save(entity));
    }
    public Flux<ActionCollection> saveAll(Iterable<ActionCollection> entities) {
        return Flux.fromIterable(repository.saveAll(entities));
    }
    public Mono<ActionCollection> findById(String id) {
        return Mono.justOrEmpty(repository.findById(id));
    }
    // End from CrudRepository

    public Flux<ActionCollection> findAllByApplicationIds(List<String> applicationIds, List<String> includeFields) {
        return Flux.fromIterable(repository.findAllByApplicationIds(applicationIds, includeFields));
    }

    public ActionCollection setUserPermissionsInObject(ActionCollection obj, Set<String> permissionGroups) {
        return repository.setUserPermissionsInObject(obj, permissionGroups);
    }

    public Flux<ActionCollection> findByApplicationId(String applicationId, AclPermission aclPermission, Sort sort) {
        return Flux.fromIterable(repository.findByApplicationId(applicationId, aclPermission, sort));
    }

    public Flux<ActionCollection> queryAll(List<Criteria> criterias, AclPermission permission) {
        return Flux.fromIterable(repository.queryAll(criterias, permission));
    }

    public Flux<ActionCollection> findByApplicationId(String applicationId) {
        return Flux.fromIterable(repository.findByApplicationId(applicationId));
    }

    public Flux<ActionCollection> findAllPublishedActionCollectionsByContextIdAndContextType(String contextId, CreatorContextType contextType, AclPermission permission) {
        return Flux.fromIterable(repository.findAllPublishedActionCollectionsByContextIdAndContextType(contextId, contextType, permission));
    }

    public Mono<ActionCollection> findByIdAndFieldNames(String id, List<String> fieldNames) {
        return Mono.justOrEmpty(repository.findByIdAndFieldNames(id, fieldNames));
    }

    public Flux<ActionCollection> findByPageId(String pageId) {
        return Flux.fromIterable(repository.findByPageId(pageId));
    }

    public Mono<List<BulkWriteResult>> bulkUpdate(List<ActionCollection> actionCollections) {
        return Mono.justOrEmpty(repository.bulkUpdate(actionCollections));
    }

    public Mono<Boolean> archiveAllById(java.util.Collection<String> ids) {
        return Mono.justOrEmpty(repository.archiveAllById(ids));
    }

    public Mono<ActionCollection> archive(ActionCollection entity) {
        return Mono.justOrEmpty(repository.archive(entity));
    }

    public Flux<ActionCollection> findByPageId(String pageId, AclPermission permission) {
        return Flux.fromIterable(repository.findByPageId(pageId, permission));
    }

    public Mono<ActionCollection> findByGitSyncIdAndDefaultApplicationId(String defaultApplicationId, String gitSyncId, Optional<AclPermission> permission) {
        return Mono.justOrEmpty(repository.findByGitSyncIdAndDefaultApplicationId(defaultApplicationId, gitSyncId, permission));
    }

    public Flux<ActionCollection> findByDefaultApplicationId(String defaultApplicationId, Optional<AclPermission> permission) {
        return Flux.fromIterable(repository.findByDefaultApplicationId(defaultApplicationId, permission));
    }

    public Mono<ActionCollection> findByBranchNameAndDefaultCollectionId(String branchName, String defaultCollectionId, AclPermission permission) {
        return Mono.justOrEmpty(repository.findByBranchNameAndDefaultCollectionId(branchName, defaultCollectionId, permission));
    }

    public Mono<UpdateResult> updateByIdAndFieldNames(String id, Map<String, Object> fieldNameValueMap) {
        return Mono.justOrEmpty(repository.updateByIdAndFieldNames(id, fieldNameValueMap));
    }

    public Flux<ActionCollection> findByApplicationIdAndViewMode(String applicationId, boolean viewMode, AclPermission aclPermission) {
        return Flux.fromIterable(repository.findByApplicationIdAndViewMode(applicationId, viewMode, aclPermission));
    }

    public Mono<ActionCollection> findByGitSyncIdAndDefaultApplicationId(String defaultApplicationId, String gitSyncId, AclPermission permission) {
        return Mono.justOrEmpty(repository.findByGitSyncIdAndDefaultApplicationId(defaultApplicationId, gitSyncId, permission));
    }

    public Flux<ActionCollection> queryAll(List<Criteria> criterias, List<String> includeFields, AclPermission permission, Sort sort) {
        return Flux.fromIterable(repository.queryAll(criterias, includeFields, permission, sort));
    }

    public Flux<ActionCollection> findAllActionCollectionsByNamePageIdsViewModeAndBranch(String name, List<String> pageIds, boolean viewMode, String branchName, AclPermission aclPermission, Sort sort) {
        return Flux.fromIterable(repository.findAllActionCollectionsByNamePageIdsViewModeAndBranch(name, pageIds, viewMode, branchName, aclPermission, sort));
    }

    public Mono<ActionCollection> findById(String id, AclPermission permission) {
        return Mono.justOrEmpty(repository.findById(id, permission));
    }

    public ActionCollection setUserPermissionsInObject(ActionCollection obj) {
        return repository.setUserPermissionsInObject(obj);
    }

    public Flux<ActionCollection> findByListOfPageIds(List<String> pageIds, Optional<AclPermission> permission) {
        return Flux.fromIterable(repository.findByListOfPageIds(pageIds, permission));
    }

    public Mono<ActionCollection> retrieveById(String id) {
        return Mono.justOrEmpty(repository.retrieveById(id));
    }

    public ActionCollection updateAndReturn(String id, Update updateObj, Optional<AclPermission> permission) {
        return repository.updateAndReturn(id, updateObj, permission);
    }

    public Flux<ActionCollection> findByApplicationId(String applicationId, Optional<AclPermission> aclPermission, Optional<Sort> sort) {
        return Flux.fromIterable(repository.findByApplicationId(applicationId, aclPermission, sort));
    }

    public Mono<Boolean> archiveById(String id) {
        return Mono.justOrEmpty(repository.archiveById(id));
    }

    public Flux<ActionCollection> findByListOfPageIds(List<String> pageIds, AclPermission permission) {
        return Flux.fromIterable(repository.findByListOfPageIds(pageIds, permission));
    }

    public Mono<List<InsertManyResult>> bulkInsert(List<ActionCollection> newActions) {
        return Mono.justOrEmpty(repository.bulkInsert(newActions));
    }

    public Flux<ActionCollection> queryAll(List<Criteria> criterias, AclPermission permission, Sort sort) {
        return Flux.fromIterable(repository.queryAll(criterias, permission, sort));
    }

    public Mono<ActionCollection> findByIdAndBranchName(String id, String branchName) {
        return Mono.justOrEmpty(repository.findByIdAndBranchName(id, branchName));
    }

    public Flux<ActionCollection> findAllUnpublishedActionCollectionsByContextIdAndContextType(String contextId, CreatorContextType contextType, AclPermission permission) {
        return Flux.fromIterable(repository.findAllUnpublishedActionCollectionsByContextIdAndContextType(contextId, contextType, permission));
    }

}