package com.appsmith.server.solutions;

import com.appsmith.server.configurations.CommonConfig;
import com.appsmith.server.configurations.LicenseConfig;
import com.appsmith.server.configurations.ProjectProperties;
import com.appsmith.server.configurations.SegmentConfig;
import com.appsmith.server.repositories.ApplicationRepository;
import com.appsmith.server.repositories.DatasourceRepository;
import com.appsmith.server.repositories.NewActionRepository;
import com.appsmith.server.repositories.NewPageRepository;
import com.appsmith.server.repositories.UserRepository;
import com.appsmith.server.repositories.WorkspaceRepository;
import com.appsmith.server.services.ConfigService;
import com.appsmith.server.services.TenantService;
import com.appsmith.server.services.UsagePulseService;
import com.appsmith.server.solutions.ce.PingScheduledTaskCEImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.scheduler.Schedulers;

/**
 * This class represents a scheduled task that pings a data point indicating that this server installation is live.
 * This ping is only invoked if the Appsmith server is NOT running in Appsmith Cloud
 */
@ConditionalOnExpression("!${is.cloud-hosting:false}")
@Slf4j
@Component
public class PingScheduledTaskImpl extends PingScheduledTaskCEImpl implements PingScheduledTask {

    private final TenantService tenantService;
    private final LicenseConfig licenseConfig;
    private final UsagePulseService usagePulseService;

    public PingScheduledTaskImpl(
            ConfigService configService,
            SegmentConfig segmentConfig,
            CommonConfig commonConfig,
            WorkspaceRepository workspaceRepository,
            ApplicationRepository applicationRepository,
            NewPageRepository newPageRepository,
            NewActionRepository newActionRepository,
            DatasourceRepository datasourceRepository,
            UserRepository userRepository,
            ProjectProperties projectProperties,
            TenantService tenantService,
            LicenseConfig licenseConfig,
            UsagePulseService usagePulseService) {

        super(
                configService,
                segmentConfig,
                commonConfig,
                workspaceRepository,
                applicationRepository,
                newPageRepository,
                newActionRepository,
                datasourceRepository,
                userRepository,
                projectProperties
        );
        this.tenantService = tenantService;
        this.licenseConfig = licenseConfig;
        this.usagePulseService = usagePulseService;
    }


    @Scheduled(initialDelay =  3 * 60 * 1000 /* three minutes */, fixedRate = 1 * 60 * 60 * 1000 /* one hour */)
    public void licenseCheck() {
        log.debug("Initiating Periodic License Check");
        tenantService.checkAndUpdateDefaultTenantLicense()
                .subscribeOn(Schedulers.boundedElastic())
                .block();
    }

    /**
     * To send the usage pulse to Cloud Services for usage and billing
     */
    @Scheduled(initialDelay = 4 * 60 * 1000 /* four minutes */, fixedRate = 30 * 60 * 1000 /* thirty minutes */)
    public void sendUsagePulse() throws InterruptedException {
        log.debug("Sending Usage Pulse");
        while(Boolean.TRUE.equals(usagePulseService.sendAndUpdateUsagePulse()
            .subscribeOn(Schedulers.boundedElastic())
            .block())) {
            // Sleep to delay continues requests
            Thread.sleep(2000);
        }
        log.debug("Completed Sending Usage Pulse");
    }

}
