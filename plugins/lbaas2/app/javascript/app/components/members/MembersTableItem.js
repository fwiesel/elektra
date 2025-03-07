import { useEffect, useState, useMemo } from "react";
import CopyPastePopover from "../shared/CopyPastePopover";
import useCommons from "../../../lib/hooks/useCommons";
import useStatus from "../../../lib/hooks/useStatus";
import StaticTags from "../StaticTags";
import useMember from "../../../lib/hooks/useMember";
import usePool from "../../../lib/hooks/usePool";
import { addNotice, addError } from "lib/flashes";
import { ErrorsList } from "lib/elektra-form/components/errors_list";
import SmartLink from "../shared/SmartLink";
import { policy } from "policy";
import { scope } from "ajax_helper";
import Log from "../shared/logger";
import DropDownMenu from "../shared/DropdownMenu";
import { MemberIpIcon, MemberMonitorIcon } from "./MemberIpIcons";
import usePolling from "../../../lib/hooks/usePolling";
import BooleanLabel from "../shared/BooleanLabel";

const MembersTableItem = ({
  props,
  poolID,
  member,
  searchTerm,
  shouldPoll,
  displayActions,
}) => {
  const { matchParams, searchParamsToString, errorMessage } = useCommons();
  const { persistPool } = usePool();
  const [loadbalancerID, setLoadbalancerID] = useState(null);
  const { persistMember, deleteMember } = useMember();
  const { entityStatus } = useStatus(
    member.operating_status,
    member.provisioning_status
  );

  useEffect(() => {
    const params = matchParams(props);
    setLoadbalancerID(params.loadbalancerID);
  }, []);

  const pollingCallback = () => {
    return persistMember(loadbalancerID, poolID, member.id);
  };

  usePolling({
    delay: member.provisioning_status.includes("PENDING") ? 20000 : 60000,
    callback: pollingCallback,
    active: shouldPoll,
  });

  const canEdit = useMemo(
    () =>
      policy.isAllowed("lbaas2:member_update", {
        target: { scoped_domain_name: scope.domain },
      }),
    [scope.domain]
  );

  const canDelete = useMemo(
    () =>
      policy.isAllowed("lbaas2:member_delete", {
        target: { scoped_domain_name: scope.domain },
      }),
    [scope.domain]
  );

  const canShowJSON = useMemo(
    () =>
      policy.isAllowed("lbaas2:member_get", {
        target: { scoped_domain_name: scope.domain },
      }),
    [scope.domain]
  );

  const handleDelete = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const memberID = member.id;
    const memberName = member.name;
    return deleteMember(loadbalancerID, poolID, memberID, memberName)
      .then((response) => {
        addNotice(
          <React.Fragment>
            Member <b>{memberName}</b> ({memberID}) is being deleted.
          </React.Fragment>
        );
        // fetch the listener again containing the new policy so it gets updated fast
        persistPool(loadbalancerID, poolID)
          .then(() => {})
          .catch((error) => {});
      })
      .catch((error) => {
        addError(
          React.createElement(ErrorsList, {
            errors: errorMessage(error.response),
          })
        );
      });
  };

  const displayName = () => {
    const name = member.name || member.id;
    return (
      <CopyPastePopover
        text={name}
        size={20}
        sliceType="MIDDLE"
        searchTerm={searchTerm}
        shouldCopy={false}
      />
    );
  };

  const displayID = () => {
    if (member.name) {
      return (
        <CopyPastePopover
          text={member.id}
          size={12}
          sliceType="MIDDLE"
          bsClass="cp copy-paste-ids"
          searchTerm={searchTerm}
        />
      );
    }
  };

  const monitorAddressPort = () => {
    if (member.monitor_address || member.monitor_port) {
      return `${member.monitor_address}:${member.monitor_port}`;
    }
  };

  return (
    <tr>
      <td className="snug-nowrap">
        {displayName()}
        {displayID()}
      </td>
      <td>{entityStatus}</td>
      <td>
        <StaticTags tags={member.tags} shouldPopover={true} />
      </td>
      <td className="snug-nowrap">
        <p className="list-group-item-text list-group-item-text-copy display-flex">
          <MemberIpIcon />
          <CopyPastePopover
            text={`${member.address}:${member.protocol_port}`}
            searchTerm={searchTerm}
          />
        </p>
        {monitorAddressPort() && (
          <p className="list-group-item-text list-group-item-text-copy display-flex">
            <MemberMonitorIcon />
            <CopyPastePopover
              text={monitorAddressPort()}
              searchTerm={searchTerm}
            />
          </p>
        )}
      </td>
      <td>{member.weight}</td>
      <td>
        <BooleanLabel value={member.backup} />
      </td>
      <td>
        <BooleanLabel value={member.admin_state_up} />
      </td>
      {displayActions && (
        <td>
          <DropDownMenu buttonIcon={<span className="fa fa-cog" />}>
            <li>
              <SmartLink
                to={`/loadbalancers/${loadbalancerID}/pools/${poolID}/members/${
                  member.id
                }/edit?${searchParamsToString(props)}`}
                isAllowed={canEdit}
                notAllowedText="Not allowed to edit. Please check with your administrator."
              >
                Edit
              </SmartLink>
            </li>
            <li>
              <SmartLink
                onClick={handleDelete}
                isAllowed={canDelete}
                notAllowedText="Not allowed to delete. Please check with your administrator."
              >
                Delete
              </SmartLink>
            </li>
            <li>
              <SmartLink
                to={`/loadbalancers/${loadbalancerID}/pools/${poolID}/members/${
                  member.id
                }/json?${searchParamsToString(props)}`}
                isAllowed={canShowJSON}
                notAllowedText="Not allowed to get JSOn. Please check with your administrator."
              >
                JSON
              </SmartLink>
            </li>
          </DropDownMenu>
        </td>
      )}
    </tr>
  );
};

export default MembersTableItem;
