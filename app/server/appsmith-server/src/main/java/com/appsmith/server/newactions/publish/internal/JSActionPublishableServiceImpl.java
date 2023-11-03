package com.appsmith.server.newactions.publish.internal;

import com.appsmith.external.helpers.AppsmithBeanUtils;
import com.appsmith.external.models.ActionDTO;
import com.appsmith.external.models.DefaultResources;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.dtos.PublishingMetaDTO;
import com.appsmith.server.repositories.NewActionRepository;
import org.bson.types.ObjectId;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class JSActionPublishableServiceImpl implements JSActionPublishableService {
    private final NewActionRepository newActionRepository;

    public JSActionPublishableServiceImpl(NewActionRepository newActionRepository) {
        this.newActionRepository = newActionRepository;
    }

    @Override
    public Mono<Map<String, List<String>>> createPublishableJSActions(
            PublishingMetaDTO publishingMetaDTO,
            List<String> sourceCollectionIds,
            Map<String, String> oldToNewCollectionIdMap) {
        final Map<String, List<String>> newCollectionIdToNewActionsMap = new HashMap<>();
        return newActionRepository
                .findAllByActionCollectionIdWithoutPermissions(sourceCollectionIds, null)
                .flatMap(sourceAction -> {
                    String newCollectionId = oldToNewCollectionIdMap.get(
                            sourceAction.getUnpublishedAction().getCollectionId());
                    NewAction toBePublishedNewAction = getNewJSAction(publishingMetaDTO, sourceAction, newCollectionId);
                    List<String> newJSActions =
                            newCollectionIdToNewActionsMap.getOrDefault(newCollectionId, new ArrayList<>());
                    newJSActions.add(toBePublishedNewAction.getId());
                    return Mono.just(toBePublishedNewAction);
                })
                .collectList()
                .flatMap(toBePublishedJSActions -> {
                    return newActionRepository
                            .saveAll(toBePublishedJSActions)
                            .collectList()
                            .thenReturn(newCollectionIdToNewActionsMap);
                });
    }

    @NotNull private NewAction getNewJSAction(
            PublishingMetaDTO publishingMetaDTO, NewAction sourceNewAction, String newCollectionId) {
        NewAction toBePublishedNewAction = new NewAction();
        AppsmithBeanUtils.copyNestedNonNullProperties(sourceNewAction, toBePublishedNewAction);
        toBePublishedNewAction.setId(new ObjectId().toString());
        toBePublishedNewAction.setPublishedAction(sourceNewAction.getUnpublishedAction());
        toBePublishedNewAction.setUnpublishedAction(new ActionDTO());
        toBePublishedNewAction.getPublishedAction().setCollectionId(newCollectionId);
        toBePublishedNewAction
                .getPublishedAction()
                .setModuleId(publishingMetaDTO
                        .getOldModuleIdToNewModuleIdMap()
                        .get(sourceNewAction.getUnpublishedAction().getModuleId()));

        DefaultResources defaultResources = new DefaultResources();
        defaultResources.setActionId(toBePublishedNewAction.getId());
        defaultResources.setCollectionId(newCollectionId);
        toBePublishedNewAction.setDefaultResources(defaultResources);
        return toBePublishedNewAction;
    }
}
