import React, {
  Component,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import styled, { ThemeContext } from "styled-components";
import { connect, useDispatch, useSelector } from "react-redux";
import MediaQuery from "react-responsive";
import { useLocation } from "react-router-dom";
import { AppState } from "reducers";
import { Classes as BlueprintClasses } from "@blueprintjs/core";
import {
  thinScrollbar,
  truncateTextUsingEllipsis,
} from "constants/DefaultTheme";
import {
  getApplicationList,
  getApplicationSearchKeyword,
  getCreateApplicationError,
  getIsCreatingApplication,
  getIsDeletingApplication,
  getIsDuplicatingApplication,
  getIsFetchingApplications,
  getIsImportingApplication,
  getIsSavingOrgInfo,
  getUserApplicationsOrgs,
  getUserApplicationsOrgsList,
} from "selectors/applicationSelectors";
import {
  ApplicationPayload,
  ReduxActionTypes,
} from "@appsmith/constants/ReduxActionConstants";
import PageWrapper from "pages/common/PageWrapper";
import SubHeader from "pages/common/SubHeader";
import ApplicationCard from "./ApplicationCard";
import OrgInviteUsersForm from "pages/organization/OrgInviteUsersForm";
import { isPermitted, PERMISSION_TYPE } from "./permissionHelpers";
import FormDialogComponent from "components/editorComponents/form/FormDialogComponent";
import Dialog from "components/ads/DialogComponent";
import { User } from "constants/userConstants";
import { getCurrentUser, selectFeatureFlags } from "selectors/usersSelectors";
import { CREATE_ORGANIZATION_FORM_NAME } from "constants/forms";
import {
  DropdownOnSelectActions,
  getOnSelectAction,
} from "pages/common/CustomizedDropdown/dropdownHelpers";
import Button, { Category, Size } from "components/ads/Button";
import Text, { TextType } from "components/ads/Text";
import Icon, { IconName, IconSize } from "components/ads/Icon";
import MenuItem from "components/ads/MenuItem";
import {
  duplicateApplication,
  updateApplication,
} from "actions/applicationActions";
import { Classes } from "components/ads/common";
import Menu from "components/ads/Menu";
import { Position } from "@blueprintjs/core/lib/esm/common/position";
import { UpdateApplicationPayload } from "api/ApplicationApi";
import PerformanceTracker, {
  PerformanceTransactionName,
} from "utils/PerformanceTracker";
import { loadingUserOrgs } from "./ApplicationLoaders";
import { creatingApplicationMap } from "reducers/uiReducers/applicationsReducer";
import EditableText, {
  EditInteractionKind,
  SavingState,
} from "components/ads/EditableText";
import { notEmptyValidator } from "components/ads/TextInput";
import { deleteOrg, saveOrg } from "actions/orgActions";
import { leaveOrganization } from "actions/userActions";
import CenteredWrapper from "components/designSystems/appsmith/CenteredWrapper";
import NoSearchImage from "assets/images/NoSearchResult.svg";
import { getNextEntityName, getRandomPaletteColor } from "utils/AppsmithUtils";
import { AppIconCollection } from "components/ads/AppIcon";
import { createOrganizationSubmitHandler } from "pages/organization/helpers";
import ImportApplicationModal from "./ImportApplicationModal";
import {
  createMessage,
  NO_APPS_FOUND,
  ORGANIZATIONS_HEADING,
  SEARCH_APPS,
} from "@appsmith/constants/messages";
import { ReactComponent as NoAppsFoundIcon } from "assets/svg/no-apps-icon.svg";

import { setHeaderMeta } from "actions/themeActions";
import SharedUserList from "pages/common/SharedUserList";
import { useIsMobileDevice } from "utils/hooks/useDeviceDetect";
import { Indices } from "constants/Layers";
import GitSyncModal from "pages/Editor/gitSync/GitSyncModal";
import ReconnectDatasourceModal from "pages/Editor/gitSync/ReconnectDatasourceModal";
import LeftPaneBottomSection from "pages/Home/LeftPaneBottomSection";
import { MOBILE_MAX_WIDTH } from "constants/AppConstants";
import {
  DEFAULT_BASE_URL_BUILDER_PARAMS,
  updateURLFactory,
} from "RouteBuilder";
import { Spinner } from "components/ads";

const OrgDropDown = styled.div<{ isMobile?: boolean }>`
  display: flex;
  padding: ${(props) => (props.isMobile ? `10px 16px` : `10px 10px`)};
  font-size: ${(props) => props.theme.fontSizes[1]}px;
  justify-content: space-between;
  align-items: center;
  ${({ isMobile }) =>
    isMobile &&
    `
    position: sticky;
    top: 0;
    background-color: #fff;
    z-index: ${Indices.Layer8};
  `}
`;

const ApplicationCardsWrapper = styled.div<{ isMobile?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ isMobile }) => (isMobile ? 12 : 20)}px;
  font-size: ${(props) => props.theme.fontSizes[4]}px;
  padding: ${({ isMobile }) => (isMobile ? `10px 16px` : `10px`)};
`;

const OrgSection = styled.div<{ isMobile?: boolean }>`
  margin-bottom: ${({ isMobile }) => (isMobile ? `8` : `40`)}px;
`;

const PaddingWrapper = styled.div<{ isMobile?: boolean }>`
  display: flex;
  align-items: baseline;
  justify-content: center;
  width: ${(props) => props.theme.card.minWidth}px;

  @media screen and (min-width: 1500px) {
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth}px;
      height: ${(props) => props.theme.card.minHeight}px;
    }
  }

  @media screen and (min-width: 1500px) and (max-width: 1512px) {
    width: ${(props) =>
      props.theme.card.minWidth + props.theme.spaces[4] * 2}px;
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth - 5}px;
      height: ${(props) => props.theme.card.minHeight - 5}px;
    }
  }
  @media screen and (min-width: 1478px) and (max-width: 1500px) {
    width: ${(props) =>
      props.theme.card.minWidth + props.theme.spaces[4] * 2}px;
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth - 8}px;
      height: ${(props) => props.theme.card.minHeight - 8}px;
    }
  }

  @media screen and (min-width: 1447px) and (max-width: 1477px) {
    width: ${(props) =>
      props.theme.card.minWidth + props.theme.spaces[3] * 2}px;
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth - 8}px;
      height: ${(props) => props.theme.card.minHeight - 8}px;
    }
  }

  @media screen and (min-width: 1417px) and (max-width: 1446px) {
    width: ${(props) =>
      props.theme.card.minWidth + props.theme.spaces[3] * 2}px;
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth - 11}px;
      height: ${(props) => props.theme.card.minHeight - 11}px;
    }
  }

  @media screen and (min-width: 1400px) and (max-width: 1417px) {
    width: ${(props) =>
      props.theme.card.minWidth + props.theme.spaces[2] * 2}px;
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth - 15}px;
      height: ${(props) => props.theme.card.minHeight - 15}px;
    }
  }

  @media screen and (max-width: 1400px) {
    width: ${(props) =>
      props.theme.card.minWidth + props.theme.spaces[2] * 2}px;
    .bp3-card {
      width: ${(props) => props.theme.card.minWidth - 15}px;
      height: ${(props) => props.theme.card.minHeight - 15}px;
    }
  }

  ${({ isMobile }) =>
    isMobile &&
    `
    width: 100% !important;
  `}
`;

const LeftPaneWrapper = styled.div`
  overflow: auto;
  width: ${(props) => props.theme.homePage.sidebar}px;
  height: 100%;
  display: flex;
  padding-left: 16px;
  padding-top: 16px;
  flex-direction: column;
  position: fixed;
  top: ${(props) => props.theme.homePage.header}px;
  box-shadow: 1px 0px 0px #ededed;
`;
const ApplicationContainer = styled.div<{ isMobile?: boolean }>`
  padding-right: ${(props) => props.theme.homePage.leftPane.rightMargin}px;
  padding-top: 16px;
  ${({ isMobile }) =>
    isMobile &&
    `
    margin-left: 0;
    width: 100%;
    padding: 0;
  `}
`;

const ItemWrapper = styled.div`
  padding: 9px 15px;
`;
const StyledIcon = styled(Icon)`
  margin-right: 11px;
`;
const OrgShareUsers = styled.div`
  display: flex;
  align-items: center;

  & .t--options-icon {
    margin-left: 8px;

    svg {
      path {
        fill: #090707;
      }
    }
  }

  & .t--new-button {
    margin-left: 8px;
  }

  & button,
  & a {
    padding: 4px 12px;
  }
`;

const NoAppsFound = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;

  & > span {
    margin-bottom: 24px;
  }
`;

const LoadingWrapper = styled.div`
  position: absolute;
  background-color: rgba(0, 0, 0, 0.2);
  bottom: 0;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9;
  display: flex;
  justify-content: center;
  align-items: center;
`;

function Item(props: {
  label: string;
  textType: TextType;
  icon?: IconName;
  isFetchingApplications: boolean;
}) {
  return (
    <ItemWrapper>
      {props.icon && <StyledIcon />}
      <Text
        className={
          props.isFetchingApplications ? BlueprintClasses.SKELETON : ""
        }
        type={props.textType}
      >
        {" "}
        {props.label}
      </Text>
    </ItemWrapper>
  );
}

const LeftPaneDataSection = styled.div`
  position: relative;
  height: calc(100vh - ${(props) => props.theme.homePage.header + 24}px);
`;

function LeftPaneSection(props: {
  heading: string;
  children?: any;
  isFetchingApplications: boolean;
}) {
  return (
    <LeftPaneDataSection>
      {/* <MenuItem text={props.heading}/> */}
      <Item
        isFetchingApplications={props.isFetchingApplications}
        label={props.heading}
        textType={TextType.SIDE_HEAD}
      />
      {props.children}
    </LeftPaneDataSection>
  );
}

const StyledAnchor = styled.a`
  position: relative;
  top: -24px;
`;

const WorkpsacesNavigator = styled.div`
  overflow: auto;
  height: calc(100vh - ${(props) => props.theme.homePage.header + 252}px);
  ${thinScrollbar};
  /* padding-bottom: 160px; */
`;

const textIconStyles = (props: { color: string; hover: string }) => {
  return `
    &&&&&& {
      .${Classes.TEXT},.${Classes.ICON} svg path {
        color: ${props.color};
        stroke: ${props.color};
        fill: ${props.color};
      }


      &:hover {
        .${Classes.TEXT},.${Classes.ICON} svg path {
          color: ${props.hover};
          stroke: ${props.hover};
          fill: ${props.hover};
        }
      }
    }
  `;
};

function OrgMenuItem({ isFetchingApplications, org, selected }: any) {
  const menuRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (selected) {
      menuRef.current?.scrollIntoView({ behavior: "smooth" });
      menuRef.current?.click();
    }
  }, [selected]);

  return (
    <MenuItem
      containerClassName={
        isFetchingApplications ? BlueprintClasses.SKELETON : ""
      }
      ellipsize={20}
      href={`${window.location.pathname}#${org.organization.id}`}
      icon="workspace"
      key={org.organization.id}
      ref={menuRef}
      selected={selected}
      text={org.organization.name}
      tooltipPos={Position.BOTTOM_LEFT}
    />
  );
}

const submitCreateOrganizationForm = async (data: any, dispatch: any) => {
  const result = await createOrganizationSubmitHandler(data, dispatch);
  return result;
};

function LeftPane() {
  const dispatch = useDispatch();
  const fetchedUserOrgs = useSelector(getUserApplicationsOrgs);
  const isFetchingApplications = useSelector(getIsFetchingApplications);
  const isMobile = useIsMobileDevice();
  let userOrgs;
  if (!isFetchingApplications) {
    userOrgs = fetchedUserOrgs;
  } else {
    userOrgs = loadingUserOrgs as any;
  }

  const location = useLocation();
  const urlHash = location.hash.slice(1);

  if (isMobile) return null;

  return (
    <LeftPaneWrapper>
      <LeftPaneSection
        heading={createMessage(ORGANIZATIONS_HEADING)}
        isFetchingApplications={isFetchingApplications}
      >
        <WorkpsacesNavigator data-cy="t--left-panel">
          {!isFetchingApplications && fetchedUserOrgs && (
            <MenuItem
              cypressSelector="t--org-new-organization-auto-create"
              icon="plus"
              onSelect={() =>
                submitCreateOrganizationForm(
                  {
                    name: getNextEntityName(
                      "Untitled organization ",
                      fetchedUserOrgs.map((el: any) => el.organization.name),
                    ),
                  },
                  dispatch,
                )
              }
              text={CREATE_ORGANIZATION_FORM_NAME}
            />
          )}
          {userOrgs &&
            userOrgs.map((org: any) => (
              <OrgMenuItem
                isFetchingApplications={isFetchingApplications}
                key={org.organization.id}
                org={org}
                selected={urlHash === org.organization.id}
              />
            ))}
        </WorkpsacesNavigator>
        <LeftPaneBottomSection />
      </LeftPaneSection>
    </LeftPaneWrapper>
  );
}

const CreateNewLabel = styled(Text)`
  margin-top: 18px;
`;

const OrgNameElement = styled(Text)<{ isMobile?: boolean }>`
  max-width: ${({ isMobile }) => (isMobile ? 220 : 500)}px;
  ${truncateTextUsingEllipsis}
`;

const OrgNameHolder = styled(Text)`
  display: flex;
  align-items: center;
`;

const OrgNameWrapper = styled.div<{ disabled?: boolean }>`
  ${(props) => {
    const color = props.disabled
      ? props.theme.colors.applications.orgColor
      : props.theme.colors.applications.hover.orgColor[9];
    return `${textIconStyles({
      color: color,
      hover: color,
    })}`;
  }}
  .${Classes.ICON} {
    display: ${(props) => (!props.disabled ? "inline" : "none")};
    margin-left: 8px;
    color: ${(props) => props.theme.colors.applications.iconColor};
  }
`;
const OrgRename = styled(EditableText)`
  padding: 0 2px;
`;

const NoSearchResultImg = styled.img`
  margin: 1em;
`;

const ApplicationsWrapper = styled.div<{ isMobile: boolean }>`
  height: calc(100vh - ${(props) => props.theme.homePage.search.height - 40}px);
  overflow: auto;
  margin-left: ${(props) =>
    props.theme.homePage.leftPane.width +
    props.theme.homePage.leftPane.rightMargin +
    props.theme.homePage.leftPane.leftPadding}px;
  width: calc(
    100% -
      ${(props) =>
        props.theme.homePage.leftPane.width +
        props.theme.homePage.leftPane.rightMargin +
        props.theme.homePage.leftPane.leftPadding}px
  );
  scroll-behavior: smooth;
  ${({ isMobile }) =>
    isMobile &&
    `
    margin-left: 0;
    width: 100%;
    padding: 0;
  `}
`;

function ApplicationsSection(props: any) {
  const enableImportExport = true;
  const dispatch = useDispatch();
  const theme = useContext(ThemeContext);
  const isSavingOrgInfo = useSelector(getIsSavingOrgInfo);
  const isFetchingApplications = useSelector(getIsFetchingApplications);
  const userOrgs = useSelector(getUserApplicationsOrgsList);
  const creatingApplicationMap = useSelector(getIsCreatingApplication);
  const currentUser = useSelector(getCurrentUser);
  const isMobile = useIsMobileDevice();
  const deleteApplication = (applicationId: string) => {
    if (applicationId && applicationId.length > 0) {
      dispatch({
        type: ReduxActionTypes.DELETE_APPLICATION_INIT,
        payload: {
          applicationId,
        },
      });
    }
  };
  const [warnLeavingOrganization, setWarnLeavingOrganization] = useState(false);
  const [warnDeleteOrg, setWarnDeleteOrg] = useState(false);
  const [orgToOpenMenu, setOrgToOpenMenu] = useState<string | null>(null);
  const updateApplicationDispatch = (
    id: string,
    data: UpdateApplicationPayload,
  ) => {
    dispatch(updateApplication(id, data));
  };
  const featureFlags = useSelector(selectFeatureFlags);

  useEffect(() => {
    // Clears URL params cache
    updateURLFactory(DEFAULT_BASE_URL_BUILDER_PARAMS);
  }, []);

  const duplicateApplicationDispatch = (applicationId: string) => {
    dispatch(duplicateApplication(applicationId));
  };

  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [
    selectedOrgIdForImportApplication,
    setSelectedOrgIdForImportApplication,
  ] = useState<string | undefined>();
  const Form: any = OrgInviteUsersForm;

  const leaveOrg = (orgId: string) => {
    setWarnLeavingOrganization(false);
    setOrgToOpenMenu(null);
    dispatch(leaveOrganization(orgId));
  };

  const handleDeleteOrg = useCallback(
    (orgId: string) => {
      setWarnDeleteOrg(false);
      setOrgToOpenMenu(null);
      dispatch(deleteOrg(orgId));
    },
    [dispatch],
  );

  const OrgNameChange = (newName: string, orgId: string) => {
    dispatch(
      saveOrg({
        id: orgId as string,
        name: newName,
      }),
    );
  };

  function OrgMenuTarget(props: {
    orgName: string;
    disabled?: boolean;
    orgSlug: string;
  }) {
    const { disabled, orgName, orgSlug } = props;

    return (
      <OrgNameWrapper className="t--org-name-text" disabled={disabled}>
        <StyledAnchor id={orgSlug} />
        <OrgNameHolder
          className={isFetchingApplications ? BlueprintClasses.SKELETON : ""}
          type={TextType.H1}
        >
          <OrgNameElement
            className={isFetchingApplications ? BlueprintClasses.SKELETON : ""}
            isMobile={isMobile}
            type={TextType.H1}
          >
            {orgName}
          </OrgNameElement>
        </OrgNameHolder>
      </OrgNameWrapper>
    );
  }

  const createNewApplication = (applicationName: string, orgId: string) => {
    const color = getRandomPaletteColor(theme.colors.appCardColors);
    const icon =
      AppIconCollection[Math.floor(Math.random() * AppIconCollection.length)];

    return dispatch({
      type: ReduxActionTypes.CREATE_APPLICATION_INIT,
      payload: {
        applicationName,
        orgId,
        icon,
        color,
      },
    });
  };

  let updatedOrgs;
  if (!isFetchingApplications) {
    updatedOrgs = userOrgs;
  } else {
    updatedOrgs = loadingUserOrgs as any;
  }

  let organizationsListComponent;
  if (
    !isFetchingApplications &&
    props.searchKeyword &&
    props.searchKeyword.trim().length > 0 &&
    updatedOrgs.length === 0
  ) {
    organizationsListComponent = (
      <CenteredWrapper
        style={{
          flexDirection: "column",
          position: "static",
        }}
      >
        <CreateNewLabel type={TextType.H4}>
          {createMessage(NO_APPS_FOUND)}
        </CreateNewLabel>
        <NoSearchResultImg alt="No result found" src={NoSearchImage} />
      </CenteredWrapper>
    );
  } else {
    organizationsListComponent = updatedOrgs.map(
      (organizationObject: any, index: number) => {
        const { applications, organization } = organizationObject;
        const hasManageOrgPermissions = isPermitted(
          organization.userPermissions,
          PERMISSION_TYPE.MANAGE_ORGANIZATION,
        );
        return (
          <OrgSection
            className="t--org-section"
            isMobile={isMobile}
            key={index}
          >
            <OrgDropDown isMobile={isMobile}>
              {(currentUser || isFetchingApplications) &&
                OrgMenuTarget({
                  orgName: organization.name,
                  orgSlug: organization.id,
                })}
              {hasManageOrgPermissions && (
                <Dialog
                  canEscapeKeyClose={false}
                  canOutsideClickClose
                  isOpen={selectedOrgId === organization.id}
                  onClose={() => setSelectedOrgId("")}
                  title={`Invite Users to ${organization.name}`}
                >
                  <Form orgId={organization.id} />
                </Dialog>
              )}
              {selectedOrgIdForImportApplication && (
                <ImportApplicationModal
                  isModalOpen={
                    selectedOrgIdForImportApplication === organization.id
                  }
                  onClose={() => setSelectedOrgIdForImportApplication("")}
                  organizationId={selectedOrgIdForImportApplication}
                />
              )}
              {isPermitted(
                organization.userPermissions,
                PERMISSION_TYPE.INVITE_USER_TO_ORGANIZATION,
              ) &&
                !isFetchingApplications && (
                  <OrgShareUsers>
                    <SharedUserList orgId={organization.id} />
                    {!isMobile && (
                      <FormDialogComponent
                        Form={OrgInviteUsersForm}
                        canOutsideClickClose
                        orgId={organization.id}
                        title={`Invite Users to ${organization.name}`}
                        trigger={
                          <Button
                            category={Category.tertiary}
                            icon={"share-line"}
                            size={Size.medium}
                            tag="button"
                            text={"Share"}
                          />
                        }
                      />
                    )}
                    {isPermitted(
                      organization.userPermissions,
                      PERMISSION_TYPE.CREATE_APPLICATION,
                    ) &&
                      !isMobile &&
                      !isFetchingApplications &&
                      applications.length !== 0 && (
                        <Button
                          className="t--new-button createnew"
                          icon={"plus"}
                          isLoading={
                            creatingApplicationMap &&
                            creatingApplicationMap[organization.id]
                          }
                          onClick={() => {
                            if (
                              Object.entries(creatingApplicationMap).length ===
                                0 ||
                              (creatingApplicationMap &&
                                !creatingApplicationMap[organization.id])
                            ) {
                              createNewApplication(
                                getNextEntityName(
                                  "Untitled application ",
                                  applications.map((el: any) => el.name),
                                ),
                                organization.id,
                              );
                            }
                          }}
                          size={Size.medium}
                          tag="button"
                          text={"New"}
                        />
                      )}
                    {(currentUser || isFetchingApplications) && !isMobile && (
                      <Menu
                        className="t--org-name"
                        closeOnItemClick
                        cypressSelector="t--org-name"
                        disabled={isFetchingApplications}
                        isOpen={organization.id === orgToOpenMenu}
                        onClose={() => {
                          setOrgToOpenMenu(null);
                        }}
                        onClosing={() => {
                          setWarnLeavingOrganization(false);
                          setWarnDeleteOrg(false);
                        }}
                        position={Position.BOTTOM_RIGHT}
                        target={
                          <Icon
                            className="t--options-icon"
                            name="context-menu"
                            onClick={() => {
                              setOrgToOpenMenu(organization.id);
                            }}
                            size={IconSize.XXXL}
                          />
                        }
                      >
                        {hasManageOrgPermissions && (
                          <>
                            <div className="px-3 py-2">
                              <OrgRename
                                cypressSelector="t--org-rename-input"
                                defaultValue={organization.name}
                                editInteractionKind={EditInteractionKind.SINGLE}
                                fill
                                hideEditIcon={false}
                                isEditingDefault={false}
                                isInvalid={(value: string) => {
                                  return notEmptyValidator(value).message;
                                }}
                                onBlur={(value: string) => {
                                  OrgNameChange(value, organization.id);
                                }}
                                placeholder="Workspace name"
                                savingState={
                                  isSavingOrgInfo
                                    ? SavingState.STARTED
                                    : SavingState.NOT_STARTED
                                }
                                underline
                              />
                            </div>
                            <MenuItem
                              cypressSelector="t--org-setting"
                              icon="settings-2-line"
                              onSelect={() =>
                                getOnSelectAction(
                                  DropdownOnSelectActions.REDIRECT,
                                  {
                                    path: `/org/${organization.id}/settings/general`,
                                  },
                                )
                              }
                              text="Settings"
                            />
                            {enableImportExport && (
                              <MenuItem
                                cypressSelector="t--org-import-app"
                                icon="download"
                                onSelect={() =>
                                  setSelectedOrgIdForImportApplication(
                                    organization.id,
                                  )
                                }
                                text="Import"
                              />
                            )}
                            <MenuItem
                              icon="share-line"
                              onSelect={() => setSelectedOrgId(organization.id)}
                              text="Share"
                            />
                            <MenuItem
                              icon="member"
                              onSelect={() =>
                                getOnSelectAction(
                                  DropdownOnSelectActions.REDIRECT,
                                  {
                                    path: `/org/${organization.id}/settings/members`,
                                  },
                                )
                              }
                              text="Members"
                            />
                          </>
                        )}
                        <MenuItem
                          icon="logout"
                          onSelect={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            !warnLeavingOrganization
                              ? setWarnLeavingOrganization(true)
                              : leaveOrg(organization.id);
                          }}
                          text={
                            !warnLeavingOrganization
                              ? "Leave Organization"
                              : "Are you sure?"
                          }
                          type={
                            !warnLeavingOrganization ? undefined : "warning"
                          }
                        />
                        {applications.length === 0 && hasManageOrgPermissions && (
                          <MenuItem
                            icon="trash"
                            onSelect={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              warnDeleteOrg
                                ? handleDeleteOrg(organization.id)
                                : setWarnDeleteOrg(true);
                            }}
                            text={
                              !warnDeleteOrg
                                ? "Delete Organization"
                                : "Are you sure?"
                            }
                            type={!warnDeleteOrg ? undefined : "warning"}
                          />
                        )}
                      </Menu>
                    )}
                  </OrgShareUsers>
                )}
            </OrgDropDown>
            <ApplicationCardsWrapper isMobile={isMobile} key={organization.id}>
              {applications.map((application: any) => {
                return (
                  <PaddingWrapper isMobile={isMobile} key={application.id}>
                    <ApplicationCard
                      application={application}
                      delete={deleteApplication}
                      duplicate={duplicateApplicationDispatch}
                      enableImportExport={enableImportExport}
                      isMobile={isMobile}
                      key={application.id}
                      update={updateApplicationDispatch}
                    />
                  </PaddingWrapper>
                );
              })}
              {applications.length === 0 && (
                <NoAppsFound>
                  <NoAppsFoundIcon />
                  <span>There’s nothing inside this organization</span>
                  {/* below component is duplicate. This is because of cypress test were failing */}
                  {!isMobile && (
                    <Button
                      className="t--new-button createnew"
                      icon={"plus"}
                      isLoading={
                        creatingApplicationMap &&
                        creatingApplicationMap[organization.id]
                      }
                      onClick={() => {
                        if (
                          Object.entries(creatingApplicationMap).length === 0 ||
                          (creatingApplicationMap &&
                            !creatingApplicationMap[organization.id])
                        ) {
                          createNewApplication(
                            getNextEntityName(
                              "Untitled application ",
                              applications.map((el: any) => el.name),
                            ),
                            organization.id,
                          );
                        }
                      }}
                      size={Size.medium}
                      tag="button"
                      text={"New"}
                    />
                  )}
                </NoAppsFound>
              )}
            </ApplicationCardsWrapper>
          </OrgSection>
        );
      },
    );
  }

  return (
    <ApplicationContainer
      className="t--applications-container"
      isMobile={isMobile}
    >
      {organizationsListComponent}
      {featureFlags.GIT_IMPORT && <GitSyncModal isImport />}
      <ReconnectDatasourceModal />
    </ApplicationContainer>
  );
}

type ApplicationProps = {
  applicationList: ApplicationPayload[];
  searchApplications: (keyword: string) => void;
  isCreatingApplication: creatingApplicationMap;
  isFetchingApplications: boolean;
  createApplicationError?: string;
  deleteApplication: (id: string) => void;
  deletingApplication: boolean;
  duplicatingApplication: boolean;
  importingApplication: boolean;
  getAllApplication: () => void;
  userOrgs: any;
  currentUser?: User;
  searchKeyword: string | undefined;
  setHeaderMetaData: (
    hideHeaderShadow: boolean,
    showHeaderSeparator: boolean,
  ) => void;
};

class Applications extends Component<
  ApplicationProps,
  { selectedOrgId: string; showOnboardingForm: boolean }
> {
  constructor(props: ApplicationProps) {
    super(props);

    this.state = {
      selectedOrgId: "",
      showOnboardingForm: false,
    };
  }

  componentDidMount() {
    PerformanceTracker.stopTracking(PerformanceTransactionName.LOGIN_CLICK);
    PerformanceTracker.stopTracking(PerformanceTransactionName.SIGN_UP);
    if (!this.props.userOrgs.length) {
      this.props.getAllApplication();
    }
    this.props.setHeaderMetaData(true, true);
  }

  componentWillUnmount() {
    this.props.setHeaderMetaData(false, false);
  }

  public render() {
    return (
      <PageWrapper displayName="Applications">
        <LeftPane />
        <MediaQuery maxWidth={MOBILE_MAX_WIDTH}>
          {(matches: boolean) => (
            <ApplicationsWrapper isMobile={matches}>
              <SubHeader
                search={{
                  placeholder: createMessage(SEARCH_APPS),
                  queryFn: this.props.searchApplications,
                  defaultValue: this.props.searchKeyword,
                }}
              />
              <ApplicationsSection searchKeyword={this.props.searchKeyword} />
            </ApplicationsWrapper>
          )}
        </MediaQuery>
        {(this.props.importingApplication ||
          this.props.duplicatingApplication) && (
          <LoadingWrapper>
            <Spinner size={IconSize.XXXXL} />
          </LoadingWrapper>
        )}
      </PageWrapper>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  applicationList: getApplicationList(state),
  isFetchingApplications: getIsFetchingApplications(state),
  isCreatingApplication: getIsCreatingApplication(state),
  createApplicationError: getCreateApplicationError(state),
  deletingApplication: getIsDeletingApplication(state),
  duplicatingApplication: getIsDuplicatingApplication(state),
  importingApplication: getIsImportingApplication(state),
  userOrgs: getUserApplicationsOrgsList(state),
  currentUser: getCurrentUser(state),
  searchKeyword: getApplicationSearchKeyword(state),
});

const mapDispatchToProps = (dispatch: any) => ({
  getAllApplication: () => {
    dispatch({ type: ReduxActionTypes.GET_ALL_APPLICATION_INIT });
  },
  searchApplications: (keyword: string) => {
    dispatch({
      type: ReduxActionTypes.SEARCH_APPLICATIONS,
      payload: {
        keyword,
      },
    });
  },
  setHeaderMetaData: (
    hideHeaderShadow: boolean,
    showHeaderSeparator: boolean,
  ) => {
    dispatch(setHeaderMeta(hideHeaderShadow, showHeaderSeparator));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Applications);
