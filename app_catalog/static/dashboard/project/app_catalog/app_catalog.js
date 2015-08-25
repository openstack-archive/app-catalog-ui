/*
 * Copyright 2015 IBM Corp.
 * Copyright 2015 Kevin Fox.
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

(function() {
    'use strict';

    angular
        .module('horizon.dashboard.project.app_catalog', [])
        .filter('encodeURIComponent', function() {
            return window.encodeURIComponent;
        }).directive('appAction', function () {
            return {
                restrict: 'EA',
//FIXME static
                templateUrl: '/static/dashboard/project/app_catalog/action.html'
            };
        }).controller('appCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            '$modal',
            'horizon.framework.widgets.toast.service',
            'appCatalogModel',
            appCatalogTableCtrl
        ]).controller('appComponentCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            'horizon.framework.widgets.toast.service',
            'appCatalogModel',
            appComponentCatalogTableCtrl
        ]).service('appCatalogModel', [
            '$http',
            'horizon.app.core.openstack-service-api.heat',
            'horizon.app.core.openstack-service-api.glance',
            'horizon.app.core.openstack-service-api.serviceCatalog',
            appCatalogModel
        ]).directive('stars', stars);

    function appCatalogModel($http, heatAPI, glanceAPI, serviceCatalog) {
        var $scope = this;
        var callbacks = {
            update: [],
            error: [],
            deprecated: [],
            retired: []
        };
        this.assets = [];
        this.assets_filtered = [];
//FIXME reduce duplication here....
        this.supported_service_type_to_label = {
            heat: 'Orchestration',
            glance: 'Images',
            murano: 'Murano'
        };
        this.service_filters = [
            {id:'heat', name:'Orchestration'},
            {id:'glance', name: 'Images'},
            {id:'murano', name: 'Murano'}
        ];
        this.service_filters_selections = {
            'heat':false,
            'glance':false,
            'murano':false
        };
        var notify_update = function(){
            angular.forEach(callbacks['update'], function(callback){
                callback();
            });
        };
        var notify_error = function(message){
            angular.forEach(callbacks['error'], function(callback){
                callback(message);
            });
        };
        var notify_deprecated = function(message){
            angular.forEach(callbacks['deprecated'], function(callback){
                callback(message);
            });
        };
        var notify_retired = function(){
            angular.forEach(callbacks['retired'], function(callback){
                callback();
            });
        };
//FIXME [{'name':'heat', 'type':'orchestration'}, {'name':'glance', 'type':'image'}]
        serviceCatalog.get().then(function(catalog){
            angular.forEach(catalog, function(entry){
                if(entry.name in $scope.supported_service_type_to_label) {
                    $scope.service_filters_selections[entry.name] = true;
                }
            });
            $scope.catalog = catalog;
            $scope.update_assets_filtered();
        });
        this.update_assets_filtered = function(){
            $scope.assets_filtered.length = 0;
            angular.forEach($scope.assets, function(asset){
                if($scope.service_filters_selections[asset.service.type] == true || asset.service.type == 'bundle'){
                    var filtered_dep = false;
                    angular.forEach(asset.depends, function(dep){
                      if($scope.service_filters_selections[dep.asset.service.type] == false){
                          filtered_dep = true;
                      }
                    });
                    if(!filtered_dep) {
                        $scope.assets_filtered.push(asset);
                    }
                }
            });
            var types = {};
            angular.forEach($scope.assets_filtered, function(asset){
                types[asset.service.type] = true;
            });
//FIXME dedup some of this later.
            var map = {'heat': 'Orchestration', 'glance': 'Images'};
            var options = [];

            for (var type in types) {
                if(type in map) {
                    options.push({'key':type, 'label':map[type]});
                }
            }
            angular.forEach($scope.asset_filter_facets, function(facet){
                if(facet.name == 'service.type') {
//FIXME Doesn't seem to work currently
//                    facet['options'] = options;
                }
            });
            notify_update();
        };
        this.toggle_service_filter = function(service_name) {
            var value = $scope.service_filters_selections[service_name];
            if(value) {
                value = false;
            } else {
                value = true;
            }
            $scope.service_filters_selections[service_name] = value;
            $scope.update_assets_filtered();
        };
        this.register_callback = function(type, callback) {
            callbacks[type].push(callback);
        };
        this.init = function(app_catalog_url) {
            var req = {
                url: app_catalog_url + '/api/v1/assets.json',
                headers: {'X-Requested-With': undefined}
            }
            $http(req).success(function(data) {
                if('deprecated' in data) {
                    notify_deprecated(data['deprecated']);
                }
                if('retired' in data) {
                    notify_retired();
                }
                for (var i in data.assets){
                    var asset = data.assets[i];
                    $scope.assets.push(asset);
                    var process = function(asset) {
                        var url = asset.attributes.url;
                        heatAPI.validate({'template_url': url}, true).success(function(data){
                            asset.validated = true;
                            notify_update();
                        }).error(function(data, status){
                            var str = 'ERROR: Could not retrieve template:'
                            asset.validated = 'unsupported';
                            if(status == 400 && data.slice(0, str.length) == str) {
                                asset.validated = 'error';
                            }
                            notify_update();
                        });
                    }
                    if (asset.service.type == 'heat') {
                        process(asset);
                    }
                }
                $scope.glance_loaded = true;
                $scope.murano_loaded = true;
                update_found_assets($scope);
            }).error(function() {
                notify_error('There was an error while retrieving entries from the Application Catalog.');
            });
            glanceAPI.getImages().success(function(data) {
                $scope.glance_images = data;
                var glance_names = {}
                for (var i in data.items){
                    var name = data.items[i]['name'];
                    glance_names[name] = {'id': data.items[i]['id']};
                }
                $scope.glance_names = glance_names;
                update_found_assets($scope);
            });
        };
        this.asset_filter_strings = {
            cancel: gettext('Cancel'),
            prompt: gettext('Search'),
            remove: gettext('Remove'),
            text: gettext('Text')
        };
        this.asset_filter_facets = [
        {
          name: 'name',
          label: gettext('Name'),
          singleton: true
        },
        {
          name: 'license',
          label: gettext('License'),
          singleton: true
        },
        {
          name: 'service.type',
          label: gettext('Service Type'),
//FIXME make dynamic later.
          options: [
            {key: 'heat', label: 'Orchestration'},
            {key: 'glance', label: 'Images'},
            {key: 'murano', label: 'Murano'}
          ],
          singleton: true
        }];
    }

    function common_init($scope, $modal, toast, appCatalogModel) {
        $scope.toggle_service_filter = appCatalogModel.toggle_service_filter;
        $scope.service_filters = appCatalogModel.service_filters;
        $scope.service_filters_selections = appCatalogModel.service_filters_selections;
        $scope.asset_filter_strings = appCatalogModel.asset_filter_strings;
        $scope.asset_filter_facets = appCatalogModel.asset_filter_facets;
        $scope.init = appCatalogModel.init;

        var retired = function(){
            var newscope = $scope.$new();
            var modal = $modal.open({
                templateUrl: "/static/dashboard/project/app_catalog/retired_panel.html",
                scope: newscope
            });
            newscope.cancel = function() {
                modal.dismiss('');
            };
        }
        var error = function(message){
          toast.add('error', message);
        }
        var deprecated = function(message){
          toast.add('warning', message);
        }
        appCatalogModel.register_callback('error', error);
        appCatalogModel.register_callback('deprecated', deprecated);
        appCatalogModel.register_callback('retired', retired);
    }

    function appCatalogTableCtrl($scope, $http, $timeout, $modal, toast, appCatalogModel) {
        $scope.assets = []
        var update = function(){
            $scope.assets = []
            for (var i in appCatalogModel.assets_filtered){
                var asset = appCatalogModel.assets_filtered[i];
                if(typeof asset.tags !== "undefined" && asset.tags.indexOf('app') > -1){
                    $scope.assets.push(asset);
                }
            }
        };
//FIXME remove. probably belongs in its own directive...
//        var textSearchWatcher = $scope.$on('textSearch', function(event, text) {
//          console.log(text);
//        });
        appCatalogModel.register_callback('update', update);
        common_init($scope, $modal, toast, appCatalogModel);
        $scope.switcher = {pannel: 'app', active: 'grid'};
        $scope.changeActivePanel = function(name) {
            $scope.switcher['active'] = name;
        };
        $scope.details = function(asset) {
            var newscope = $scope.$new();
            newscope.asset = asset;
            var modal = $modal.open({
//FIXME static from where?
                templateUrl: "/static/dashboard/project/app_catalog/details_panel.html",
                scope: newscope
            });
            newscope.cancel = function() {
                modal.dismiss('');
            };
        };
    }

    function appComponentCatalogTableCtrl($scope, $http, $timeout, toast, appCatalogModel) {
        $scope.assets = appCatalogModel.assets_filtered
        var update = function(){
            $timeout(function() {
                $scope.assets = appCatalogModel.assets_filtered
            }, 0, false);
        };
        appCatalogModel.register_callback('update', update);
        common_init($scope, toast, appCatalogModel);
        $scope.switcher = {pannel: 'component', active: 'list'};
    }

    function update_found_assets($scope) {
        if('glance_loaded' in $scope && 'glance_names' in $scope){
            for (var i in $scope.assets){
                if($scope.assets[i].service.type != 'glance'){
                    continue;
                }
                var name = $scope.assets[i].name;
                var is_installed = name in $scope.glance_names;
                $scope.assets[i].installed = is_installed;
                if(is_installed){
                    $scope.assets[i].installed_id = $scope.glance_names[name]['id'];
               }
            }
        }
        var asset_name_to_asset = {};
        angular.forEach($scope.assets, function(asset){
            asset_name_to_asset[asset.name] = asset;
        });
        angular.forEach($scope.assets, function(asset){
            if('depends' in asset) {
                angular.forEach(asset.depends, function(dep){
                    dep.asset = asset_name_to_asset[dep.name];
                });
            }
        });
        $scope.update_assets_filtered();
    }

    function stars() {
        var star = angular.element('<i>');
        star.addClass('fa fa-star');
        star.css({ color: 'goldenrod' });
        return {
            restrict: 'E',
            scope: { value: '=' },
            link: function(scope, element){
                for (var i = 0; i < scope.value; i++){
                    element.append(star.clone());
                }
            }
        };
    }

})();
