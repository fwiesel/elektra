require 'rack'

module Lbaas2
  module Loadbalancers
    module Pools
      class MembersController < ::AjaxController
        authorization_context 'lbaas2'
        authorization_required

        def index
          limit = (params[:limit] || 9999).to_i
          sort_key = (params[:sort_key] || 'name')
          sort_dir = (params[:sort_dir] || 'asc')
          pagination_options = { sort_key: sort_key, sort_dir: sort_dir, limit: limit + 1 }
          pagination_options[:marker] = params[:marker] if params[:marker]

          members = services.lbaas2.members(params[:pool_id], pagination_options)
          render json: {
            members: members,
            has_next: members.length > limit,
            limit: limit, sort_key: sort_key, sort_dir: sort_dir
          }
        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: '500'
        end

        def show
          member = services.lbaas2.find_member(params[:pool_id], params[:id])
          render json: {
            member: member
          }
        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: '500'
        end

        def create
          membersParams = member_params
          # OS Bug, Subnet not optional, has to be set to VIP subnet
          loadbalancer = services.lbaas2.find_loadbalancer(params[:loadbalancer_id])
          vip_subnet_id = loadbalancer.vip_subnet_id
          newParams = membersParams.merge(pool_id: params[:pool_id], subnet_id: vip_subnet_id, project_id: @scoped_project_id)
          member = services.lbaas2.new_member(newParams)       

          if member.save
            audit_logger.info(current_user, 'has created', member)
            render json: member
          else
            render json: {errors: member.errors}, status: 422
          end

        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: '500'
        end

        def update
          membersParams = member_params  
          # set monitor address port to null if empty
          membersParams['monitor_address'] = nil if membersParams['monitor_address'].blank?
          membersParams['monitor_port'] = nil if membersParams['monitor_port'].blank?
          newParams = membersParams.merge(pool_id: params[:pool_id], id: params[:id])
          member = services.lbaas2.new_member(newParams)
          if member.update
            audit_logger.info(current_user, 'has updated', member)
            render json: member
          else
            render json: {errors: member.errors}, status: 422
          end
        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: "500"
        end

        # TODO wait to octavia Ussuri upgrade since the flag additive_only is necessary
        # TODO add policy for this new route and tests
        def batch_update
          # membersParams = members_params
          # success = true
          # errors = []
          # saved_members = []
          # results = {}
          # membersParams.each do |_k, values|
          #   # convert tags to array do to parse_nested_query
          #   values['tags'] = JSON.parse(values['tags']) unless values['tags'].blank?
          #   # set monitor address port to null if empty
          #   values['monitor_address'] = nil if values['monitor_address'].blank?
          #   values['monitor_port'] = nil if values['monitor_port'].blank?
          #   newParams = values.merge(pool_id: params[:pool_id], id: params[:id])
          #   member = services.lbaas2.new_member(newParams)

          #   # member.update_attributes(newParams)
          #   if member.update
          #     results[member.identifier] = member.attributes.merge({ saved: true })
          #     saved_members << member
          #     audit_logger.info(current_user, 'has updated', member)
          #   else
          #     success = false
          #     results[member.identifier] = member.attributes.merge({ saved: false })
          #     errors << { "row #{member.index}": member.errors }
          #   end
          # end

          # if success
          #   render json: saved_members.first
          # else
          #   sortedErrors = errors.sort_by { |hsh| hsh.keys.first }
          #   render json: { errors: sortedErrors, results: results }, status: 422
          # end
        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: '500'
        end

        def destroy
          member = services.lbaas2.new_member
          member.pool_id = params[:pool_id]
          member.id = params[:id]

          if member.destroy
            audit_logger.info(current_user, 'has deleted', member)
            head 202
          else
            render json: { errors: member.errors }, status: 422
          end
        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: '500'
        end

        def serversForSelect
          # fetch the lb
          loadbalancer = services.lbaas2.find_loadbalancer(params[:loadbalancer_id])
          vip_network_id = loadbalancer.vip_network_id

          # fetch the ports from the network
          ports = services.networking.ports(network_id: vip_network_id)
          selected_ips = []
          ports.each do |port|
            next if port.fixed_ips.blank?

            port.fixed_ips.each do |obj|
              selected_ips << obj['ip_address'] unless obj['ip_address'].blank?
            end
          end

          # get all servers
          per_page = params[:per_page] || 9999
          per_page = per_page.to_i
          servers = paginatable(per_page: per_page) do |pagination_options|
            services.compute.servers(pagination_options)
          end

          # select all available floating ips attached to the servers
          select_servers = []
          servers.each do |server|
            server.addresses.each do |_network_name, ip_values|
              next unless ip_values && !ip_values.empty?

              ip_values.each do |value|
                next unless value['OS-EXT-IPS:type'] == 'fixed'

                next unless selected_ips.include? value['addr']

                select_servers << { "label": "#{value['addr']} - #{server.name} (#{server.id})",
                                    "value": value['addr'], "address": value['addr'], "name": server.name, "id": server.id }
              end
            end
          end

          render json: {
            servers: select_servers
          }
        rescue Elektron::Errors::ApiResponse => e
          render json: { errors: e.message }, status: e.code
        rescue Exception => e
          render json: { errors: e.message }, status: '500'
        end

        private

        def member_params
          member = params[:member] || {}
          member[:protocol_port] = member[:protocol_port].to_i unless member[:protocol_port].blank?
          member[:monitor_port] = member[:monitor_port].to_i unless member[:monitor_port].blank?
          member[:weight] = member[:weight].to_i unless member[:weight].blank?
          member
        end

        def members_params
          params
        end

      end
    end
  end
end
