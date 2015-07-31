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
        .module('hz.dashboard.project.app_catalog', ['hz.dashboard'])
        .filter('encodeURIComponent', function() {
            return window.encodeURIComponent;
        })
        .controller('appCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            'appCatalogModel',
            appCatalogTableCtrl
        ]).controller('appComponentCatalogTableCtrl', [
            '$scope',
            '$http',
            '$timeout',
            'appCatalogModel',
            appComponentCatalogTableCtrl
        ]).service('appCatalogModel', [
            '$http',
            'horizon.openstack-service-api.heat',
            'horizon.openstack-service-api.glance',
            appCatalogModel
        ]).directive('stars', stars);

    function appCatalogModel($http, heatAPI, glanceAPI) {
        var callbacks = [];
        this.register_callback = function(callback) {
            callbacks.push(callback);
        };
        var notify = function(){
            angular.forEach(callbacks, function(callback){
                callback();
            });
        };
        this.assets = [];
        var $scope = this;
        var heat_req = {
            url: 'http://apps.openstack.org/static/heat_templates.json',
            headers: {'X-Requested-With': undefined}
        }
        $http(heat_req).success(function(data) {
            for (var i in data.assets){
                var asset = data.assets[i];
                $scope.assets.push(asset);
                var process = function(asset) {
                    var url = asset.attributes.url;
                    heatAPI.validate({'template_url': url}).success(function(data){
                        asset.validated = true;
                        notify();
                    }).error(function(data, status){
                        var str = 'ERROR: Could not retrieve template:'
                        asset.validated = 'unsupported';
                        if(status == 400 && data.slice(0, str.length) == str) {
                            asset.validated = 'error'
                        }
                        notify();
                    });
                }
                process(asset);
            }
            console.log("Processed:", data);
            notify();
        });
        var glance_req = {
            url: 'http://apps.openstack.org/static/glance_images.json',
            headers: {'X-Requested-With': undefined}
        }
        glanceAPI.getImages().success(function(data) {
            $scope.glance_images = data;
            var glance_names = {}
            for (var i in data.items){
                var name = data.items[i]['name'];
                glance_names[name] = {'id': data.items[i]['id']};
            }
            $scope.glance_names = glance_names;
            update_found_assets($scope)
            notify();
        });
        $http(glance_req).success(function(data) {
            console.log('glace images...');
            console.log(data);
            for (var i in data.assets){
                var asset = data.assets[i];
                $scope.assets.push(asset);
            }
            $scope.glance_loaded = true;
            update_found_assets($scope);
            notify();
        });
    }

    function appCatalogTableCtrl($scope, $http, $timeout, appCatalogModel) {
        //$scope.assets = appCatalogModel.assets
        $scope.assets = []
        var update = function(){
            $scope.assets = []
            for (var i in appCatalogModel.assets){
                var asset = appCatalogModel.assets[i];
                if(typeof asset.tags !== "undefined" && asset.tags.indexOf('app') > -1){
                    $scope.assets.push(asset);
                }
            }
        };
        appCatalogModel.register_callback(update);
    }

    function appComponentCatalogTableCtrl($scope, $http, $timeout, appCatalogModel) {
        $scope.assets = appCatalogModel.assets
        var update = function(){
            $timeout(function() {
            }, 0, false);
        };
        appCatalogModel.register_callback(update);
    }

    function update_found_assets($scope) {
        if('glance_loaded' in $scope && 'glance_names' in $scope){
            console.log('updating...');
            console.log($scope);
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
    }
/*
    function appComponentCatalogTableCtrl($scope, $http, glanceAPI) {
        var req = {
            url: 'http://apps.openstack.org/static/glance_images.json',
            headers: {'X-Requested-With': undefined}
        }
        glanceAPI.getImages().success(function(data) {
            $scope.glance_images = data;
            var glance_names = {}
            for (var i in data.items){
                var name = data.items[i]['name'];
                glance_names[name] = {'id': data.items[i]['id']};
            }
            $scope.glance_names = glance_names;
            update_found_assets($scope)
        });
        $http(req).success(function(data) {
            $scope.assets = data.assets;
            update_found_assets($scope);
        });
    }
*/
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
