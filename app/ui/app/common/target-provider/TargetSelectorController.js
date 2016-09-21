/**
 * Copyright (c) 2015 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function () {
    "use strict";

    App.controller('TargetSelectorController', function (targetProvider, $scope, UserProvider, $state, $rootScope, PlatformContextProvider) {
        var user = {};

        $scope.targetHeader = $state.current.targetHeader;
        $scope.platformInfo = {};

        $scope.organization = {
            selected: targetProvider.getOrganization(),
            available: targetProvider.getOrganizations(),
            set: function (org) {
                $scope.selectedOrg = org;
                targetProvider.setOrganization(org);
            }
        };

        $scope.targetSpace = {
            selected: targetProvider.getSpace(),
            available: targetProvider.getSpaces(),
            set: function (space) {
                targetProvider.setSpace(space);
            }
        };

        UserProvider.getUser().then(function (_user) {
            user = _user;
            $scope.organization.available = getAvailableOrgs(user.role, targetProvider.getOrganizations(),
                $scope.targetHeader);
        });

        $rootScope.$on("$stateChangeSuccess", function() {
            $scope.targetHeader = $state.current.targetHeader;
            $scope.organization.available = getAvailableOrgs(user.role, targetProvider.getOrganizations(),
                $scope.targetHeader);
        });

        $scope.$watch('selectedOrg', function () {
            $scope.targetSpace.available = sortOrgAndSpacesByName($scope.organization.selected.spaces);
        });

        $scope.$watchCollection('organizations', function () {

            //this handler should run only when organization list is loaded - should not act while returned list is still empty
            if(_.isEmpty($scope.organizations)) {
                return;
            }

            UserProvider.getUser().then(function (user) {
                $scope.organization.available = sortOrgAndSpacesByName($scope.organizations);
                if (user.role !== 'ADMIN' && $scope.targetHeader.managedOnly) {
                    $scope.organization.available = _.where($scope.organizations, {manager: true});
                }

                if (!_.findWhere($scope.organization.available, {guid: $scope.organization.selected.guid})) {
                    $scope.organization.selected = $scope.organization.available[0];
                    targetProvider.setOrganization($scope.organization.selected);
                }
            });
        });

        $scope.openLogs = function() {
            var visualizations = $scope.platformInfo.external_tools.visualizations,
                logsItem       = _.find(visualizations, function(item) { return item.name === "logs"; } );
                org            = targetProvider.getOrganization().name,
                space          = targetProvider.getSpace().name,
                url            = logsItem.url + "/app/kibana#/discover?_g=" +
                        "(" +
                            "refreshInterval:(display:Off,pause:!f,value:0)," +
                            "time:(from:now-15m,mode:quick,to:now)" +
                        ")" +
                        "&_a=" +
                        "(" +
                            "columns:!(_source)," +
                            "filters:!(" +
                                "(" +
                                    "'$state':(store:appState)," +
                                    "meta:(alias:!n,disabled:!f,index:'logs-app-*',key:'@cf.org',negate:!f,value:" + org + ")," +
                                    "query:(" +
                                        "match:('@cf.org':(query:" + org + ",type:phrase))" +
                                    ")" +
                                ")," +
                                "(" +
                                    "'$state':(store:appState)," +
                                    "meta:(alias:!n,disabled:!f,index:'logs-app-*',key:'@cf.space',negate:!f,value:" + space + ")," +
                                    "query:(" +
                                        "match:('@cf.space':(query:" + space + ",type:phrase))" +
                                    ")" +
                                ")" +
                            ")," +
                            "index:'logs-app-*'," +
                            "interval:auto," +
                            "query:(query_string:(analyze_wildcard:!t,query:'*'))," +
                            "sort:!('@timestamp',desc)" +
                        ")"
            window.open(url);
        };

        $scope.openMetrics = function() {
            var visualizations = $scope.platformInfo.external_tools.visualizations,
                metricsItem    = _.find(visualizations, function(item) { return item.name === "space-metrics"; } );
                org            = targetProvider.getOrganization().name,
                space          = targetProvider.getSpace().name,
                url            = metricsItem.url;
            url = url.replace("<org>", org);
            url = url.replace("<space>", space);
            window.open(url);
        };

        PlatformContextProvider.getPlatformContext()
            .then(function (response) {
                $scope.platformInfo = response;
            });
    });

    function sortOrgAndSpacesByName(items) {
        return _.sortBy(items, 'name');
    }

    function getAvailableOrgs(role, orgs, targetHeader) {
        orgs = sortOrgAndSpacesByName(orgs);
        if(role !== 'ADMIN' && targetHeader.managedOnly) {
            return getCurrentOrgManagerOrgs(orgs);
        }
        return orgs;
    }

    function getCurrentOrgManagerOrgs(orgs) {
        return _.where(orgs, {manager: true});
    }
}());
