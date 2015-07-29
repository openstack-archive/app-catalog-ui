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
            'horizon.openstack-service-api.heat',
            appCatalogTableCtrl
        ]).controller('appComponentCatalogTableCtrl', [
            '$scope',
            '$http',
            'horizon.openstack-service-api.glance',
            appComponentCatalogTableCtrl
        ]).directive('stars', stars);

    function appCatalogTableCtrl($scope, $http, heatAPI) {
        var req = {
            url: 'http://apps.openstack.org/static/heat_templates.json',
            headers: {'X-Requested-With': undefined}
        }
        $http(req).success(function(data) {
            $scope.templates = data.templates;
            for (var i in $scope.templates){
                var process = function(template, url) {
                    var url = template.attributes.url;
                    heatAPI.validate({'template_url': url}).success(function(data){
                        template.validated = true;
                    }).error(function(data, status){
                        var str = 'ERROR: Could not retrieve template:'
                        template.validated = 'unsupported';
                        if(status == 400 && data.slice(0, str.length) == str) {
                            template.validated = 'error'
                        }
                    });
                }
                process($scope.templates[i]);
            }
        });
    }

    function update_found_images($scope) {
        if('images' in $scope && 'glance_names' in $scope){
            for (var i in $scope.images){
                var name = $scope.images[i].name;
                var is_installed = name in $scope.glance_names;
                $scope.images[i].installed = is_installed;
                if(is_installed){
                    $scope.images[i].installed_id = $scope.glance_names[name]['id'];
               }
            }
        }
    }

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
            update_found_images($scope)
        });
        $http(req).success(function(data) {
            $scope.images = data.images;
            update_found_images($scope);
        });
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
