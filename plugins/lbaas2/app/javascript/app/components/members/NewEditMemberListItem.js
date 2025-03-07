import React, { useState, useMemo } from "react";
import FormInput from "../shared/FormInput";
import TagsInput from "../shared/TagsInput";
import uniqueId from "lodash/uniqueId";
import Select from "react-select";
import Log from "../shared/logger";
import { MemberIpIcon, MemberMonitorIcon } from "./MemberIpIcons";

const styles = {
  container: (base) => ({
    ...base,
    flex: 1,
  }),
  menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
  menu: (provided) => ({ ...provided, zIndex: 9999 }),
};

const CustomLabel = ({ htmlFor, labelText, required }) => {
  let className = "control-label" + " " + (required ? "required" : "optional");
  return (
    <label className={className} htmlFor={htmlFor}>
      {labelText}
      {required && <abbr title="required">*</abbr>}
    </label>
  );
};

const NewEditMemberListItem = ({
  member,
  index,
  onRemoveMember,
  servers,
  edit,
}) => {
  const [selectedServers, setSelectedServers] = useState([]);
  const [name, setName] = useState(member.name);
  const [address, setAddress] = useState(member.address);
  const [showServers, setShowServers] = useState(false);

  // create a new id just if the index is different.
  // Avoid rerenders just because it creates a new object with the same id
  const collapseId = useMemo(() => {
    return uniqueId("collapseServerSelect-");
  }, [index]);

  const onChangeServers = (values) => {
    setSelectedServers(values);
    if (values) {
      setName(values?.name || "");
      setAddress(values?.address || "");
    }
  };

  Log.debug("RENDER NewEditMemberListItem");

  return useMemo(() => {
    return (
      <>
        {index > 0 && <hr />}
        <div className="row display-flex">
          <div className="col-md-12">
            {servers && (
              <div className="row">
                <div className="col-md-1"></div>
                <div className="col-md-11">
                  <div className="display-flex new-member-item-actions">
                    <div
                      className="action-link"
                      onClick={() => setShowServers(!showServers)}
                      data-toggle="collapse"
                      data-target={`#${collapseId}`}
                      aria-expanded={showServers}
                      aria-controls={collapseId}
                    >
                      {showServers ? (
                        <>
                          <span>
                            Choose name and IP from an existing server
                          </span>
                          <i className="fa fa-chevron-circle-up" />
                        </>
                      ) : (
                        <>
                          <span>
                            Choose name and IP from an existing server
                          </span>
                          <i className="fa fa-chevron-circle-down" />
                        </>
                      )}
                    </div>
                    {index > 0 && (
                      <div
                        className="new-member-item-remove action-link"
                        onClick={() => onRemoveMember(member.id)}
                      >
                        <span>Remove</span>
                        <i className="fa fa-trash fa-fw" />
                      </div>
                    )}
                  </div>
                  <div className="collapse margin-top" id={collapseId}>
                    <Select
                      className="basic-single server-select"
                      classNamePrefix="select"
                      isDisabled={false}
                      isLoading={servers.isLoading}
                      isClearable={true}
                      isRtl={false}
                      isSearchable={true}
                      name="servers"
                      onChange={onChangeServers}
                      options={servers.items}
                      isMulti={false}
                      closeMenuOnSelect={true}
                      styles={styles}
                      value={selectedServers}
                      placeholder="Select..."
                    />
                    {servers.error && (
                      <span className="text-danger">{servers.error}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="row margin-top">
              <div className="col-md-1">
                <CustomLabel
                  htmlFor={`member[${member.id}][name]`}
                  labelText="Name"
                  required
                />
              </div>
              <div className="col-md-6">
                <FormInput name={`member[${member.id}][name]`} value={name} />
              </div>
              <div className="col-md-1">
                <CustomLabel
                  htmlFor={`member[${member.id}][backup]`}
                  labelText="Backup"
                />
              </div>
              <div className="col-md-4">
                <FormInput
                  type="checkbox"
                  name={`member[${member.id}][backup]`}
                  value={member.backup}
                />
              </div>
            </div>

            <div className="row margin-top">
              <div className="col-md-1">
                <CustomLabel
                  htmlFor={`member[${member.id}][address]`}
                  labelText="IPs"
                  required
                />
              </div>
              <div className="col-md-6">
                <div className="display-flex member-icon-in-input member-required-icon">
                  <MemberIpIcon />
                  <FormInput
                    name={`member[${member.id}][address]`}
                    value={address}
                    disabled={edit}
                    placeholder="IP Address &#42;"
                    extraClassName="icon-in-input"
                  />
                  <span className="horizontal-padding-min">:</span>
                  <FormInput
                    type="number"
                    name={`member[${member.id}][protocol_port]`}
                    value={member.protocol_port}
                    disabled={edit}
                    placeholder="Port &#42;"
                    size="lg"
                  />
                </div>
              </div>
              <div className="col-md-1">
                <CustomLabel
                  htmlFor={`member[${member.id}][weight]`}
                  labelText="Weight"
                />
              </div>
              <div className="col-md-4">
                <FormInput
                  type="number"
                  name={`member[${member.id}][weight]`}
                  value={member.weight || "1"}
                />
              </div>
            </div>

            <div className="row margin-top">
              <div className="col-md-1"></div>
              <div className="col-md-6">
                <div className="display-flex member-icon-in-input">
                  <MemberMonitorIcon />
                  <FormInput
                    name={`member[${member.id}][monitor_address]`}
                    value={member.monitor_address}
                    placeholder="Alternate Monitor IP"
                    extraClassName="icon-in-input"
                  />
                  <span className="horizontal-padding-min">:</span>
                  <FormInput
                    type="number"
                    name={`member[${member.id}][monitor_port]`}
                    value={member.monitor_port}
                    placeholder="Port"
                    size="lg"
                  />
                </div>
              </div>
              <div className="col-md-1">
                <CustomLabel
                  htmlFor={`member[${member.id}][tags]`}
                  labelText="Tags"
                />
              </div>
              <div className="col-md-4">
                <TagsInput
                  name={`member[${member.id}][tags]`}
                  initValue={member.tags}
                />
              </div>
            </div>
            {edit && (
              <div className="row margin-top">
                <div className="col-md-1"></div>
                <div className="col-md-6"></div>
                <div className="col-md-1">
                  <CustomLabel
                    htmlFor={`member[${member.id}][admin_state_up]`}
                    labelText={
                      <>
                        <span>Admin </span>
                        <span className="nowrap">State Up</span>
                      </>
                    }
                  />
                </div>
                <div className="col-md-4">
                  <FormInput
                    type="checkbox"
                    name={`member[${member.id}][admin_state_up]`}
                    value={member.admin_state_up}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }, [
    showServers,
    collapseId,
    JSON.stringify(servers),
    selectedServers,
    JSON.stringify(member),
    name,
    address,
    onRemoveMember,
    setShowServers,
    onChangeServers,
  ]);
};

export default NewEditMemberListItem;
