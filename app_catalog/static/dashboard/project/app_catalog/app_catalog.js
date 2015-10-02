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
        templateUrl: STATIC_URL + 'dashboard/project/app_catalog/action.html'
      };
    }).directive('appCatalogMagicSearch', [
      'horizon.framework.widgets.basePath',
      appCatalogMagicSearchBar
    ]).controller('appCatalogTableCtrl', [
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
      '$modal',
      'horizon.framework.widgets.toast.service',
      'appCatalogModel',
      appComponentCatalogTableCtrl
    ]).service('appCatalogModel', [
      '$http',
      '$injector',
      'horizon.app.core.openstack-service-api.heat',
      'horizon.app.core.openstack-service-api.glance',
      'horizon.app.core.openstack-service-api.serviceCatalog',
      appCatalogModel
    ]).directive('stars', stars);

  function appCatalogModel($http, $injector, heatAPI, glanceAPI, serviceCatalog) {
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
    var notifyUpdate = function() {
      angular.forEach(callbacks.update, function(callback) {
        callback();
      });
    };
    var notifyError = function(message) {
      angular.forEach(callbacks.error, function(callback) {
        callback(message);
      });
    };
    var notifyDeprecated = function(message) {
      angular.forEach(callbacks.deprecated, function(callback) {
        callback(message);
      });
    };
    var notifyRetired = function() {
      angular.forEach(callbacks.retired, function(callback) {
        callback();
      });
    };
    var muranoAPI;
    $scope.has_murano = false;
    $scope.selected_facets = [];
    $scope.selected_text = "";
    if ($injector.has('horizon.app.core.openstack-service-api.murano')) {
      muranoAPI = $injector.get('horizon.app.core.openstack-service-api.murano');
      $scope.has_murano = true;
    }
//FIXME [{'name':'heat', 'type':'orchestration'}, {'name':'glance', 'type':'image'}]
    serviceCatalog.get().then(function(catalog) {
      angular.forEach(catalog, function(entry) {
        if (entry.name in $scope.supported_service_type_to_label) {
          $scope.service_filters_selections[entry.name] = true;
        }
      });
      $scope.catalog = catalog;
      $scope.update_assets_filtered();
    });
    this.update_assets_filtered = function() {
//FIXME this is not ideal...
      var textSearchableFields = [
        ['name'],
        ['provided_by', 'name'],
        ['provided_by', 'company'],
        ['supported_by', 'name'],
        ['description'],
        ['license'],
        ['service', 'type'],
        ['service', 'container_format'],
        ['service', 'disk_format'],
        ['service', 'package_name'],
        ['service', 'murano_package_name']
      ];
      $scope.assets_filtered.length = 0;
      angular.forEach($scope.assets, function(asset) {
        if ($scope.service_filters_selections[asset.service.type] == true ||
            asset.service.type == 'bundle') {
          var filteredOut = false;
          angular.forEach(asset.depends, function(dep) {
            if ($scope.service_filters_selections[dep.asset.service.type] == false) {
              filteredOut = true;
            }
          });
          if ($scope.selected_facets.length != 0) {
            angular.forEach($scope.selected_facets, function(filter) {
              var val = filter[0].split('.').reduce(function(obj,i) {return obj[i];}, asset);
              if (val.toLowerCase().indexOf(filter[1].toLowerCase()) == -1) {
                filteredOut = true;
              }
            });
          }
          if ($scope.selected_text != '') {
            var found = false;
            angular.forEach(textSearchableFields, function(field) {
              try {
                var val = field.reduce(function(obj,i) {return obj[i];}, asset);
                if (val.toLowerCase().indexOf($scope.selected_text.toLowerCase()) != -1) {
                  found = true;
                }
              } catch (e) {}
            });
            if (!found) {
              filteredOut = true;
            }
          }
          if (!filteredOut) {
            $scope.assets_filtered.push(asset);
          }
        }
      });
      var types = {};
      angular.forEach($scope.assets_filtered, function(asset) {
        types[asset.service.type] = true;
      });
//FIXME dedup some of this later.
      var map = {'heat': 'Orchestration', 'glance': 'Images'};
      var options = [];

      angular.forEach(types, function(type) {
        if (type in map) {
          options.push({'key':type, 'label':map[type]});
        }
      });
      angular.forEach($scope.asset_filter_facets, function(facet) {
        if (facet.name == 'service.type') {
//FIXME Doesn't seem to work currently
//                    facet['options'] = options;
        }
      });
      notifyUpdate();
    };
    this.toggle_service_filter = function(serviceName) {
      var value = $scope.service_filters_selections[serviceName];
      if (value) {
        value = false;
      } else {
        value = true;
      }
      $scope.service_filters_selections[serviceName] = value;
      $scope.update_assets_filtered();
    };
    this.register_callback = function(type, callback) {
      callbacks[type].push(callback);
    };
    var semver_compare = function(a, b) {
      var v = a[0] - b[0]
      if (v === 0) {
        v = a[1] - b[1];
        if (v === 0) {
          v = a[2] - b[2];
        }
      }
      return v;
    };
    $scope.eversion_check = function(asset, version) {
      if (!( 'ever' in asset.service)) {
        return true;
      }
      var matched = false;
      angular.forEach(asset.service.ever, function(ever) {
        var has_min = 'min' in ever;
        var has_max = 'max' in ever;
        if(has_max && has_min) {
          if (semver_compare(ever.min, version) <= 0 &&
              semver_compare(version, ever.max) <= 0) {
            matched = true;
          }
        } else if (has_max) {
          if (semver_compare(version, ever.max) <= 0) {
            matched = true;
          }
        } else if (has_min) {
          if (semver_compare(ever.min, version) <= 0) {
            matched = true;
          }
        }
      });
      return matched;
    };
    this.init = function(appCatalogSettings) {
//FIXME move this to a test file.
//      test_evars($scope);
      var tver = appCatalogSettings.APP_CATALOG_VERSION.VER;
      var defaultVersion = [2015, 2, 0]; //Mitaka
      if (tver.indexOf('8.') === 0) {
        defaultVersion = [2015,1,0]; //Liberty
      }
      var appCatalogUrl = appCatalogSettings.APP_CATALOG_URL;
      $scope.heat_release = appCatalogSettings.HEAT_VERSION.REL;
      $scope.heat_version = appCatalogSettings.HEAT_VERSION.VER;
      if($scope.heat_version) {
        $scope.heat_version = $scope.heat_version.split('.', 3).map(Number);
      } else {
        $scope.heat_version = defaultVersion;
      }
      $scope.murano_release = appCatalogSettings.MURANO_VERSION.REL;
      $scope.murano_version = appCatalogSettings.MURANO_VERSION.VER;
      if($scope.murano_version) {
        $scope.murano_version = $scope.murano_version.split('.', 3).map(Number);
      } else {
        $scope.murano_version = defaultVersion;
      }
      var req = {
        url: appCatalogUrl + '/api/v1/assets',
        headers: {
          'X-Requested-With': undefined,
          'X-App-Catalog-Versions': [
            appCatalogSettings.HORIZON_VERSION.VER,
            appCatalogSettings.HORIZON_VERSION.REL,
            appCatalogSettings.APP_CATALOG_VERSION.VER,
            appCatalogSettings.APP_CATALOG_VERSION.REL
          ].join(' ')
        }
      };
      $http(req).success(function(data) {
        if ('deprecated' in data) {
          notifyDeprecated(data.deprecated);
        }
        if ('retired' in data) {
          notifyRetired();
        }
        var process = function(asset) {
          var url = asset.attributes.url;
          var args = {'template_url': url};
          if ($scope.eversion_check(asset, $scope.heat_version) != true) {
            asset.disabled = true;
            notifyUpdate();
            return;
          }
          if ('environment' in asset.service ) {
            args['environment'] = asset.service.environment;
          }
          heatAPI.validate(args, true).success(function(data) {
            asset.validated = true;
            notifyUpdate();
          }).error(function(data, status) {
            var str = 'ERROR: Could not retrieve template:';
            asset.disabled = true;
            asset.validated = 'unsupported';
            if (status == 400 && data.slice(0, str.length) == str) {
              asset.validated = 'error';
            }
            notifyUpdate();
          });
        };
        angular.forEach(data.assets, function(asset) {
          $scope.assets.push(asset);
          if ('version' in asset.service && asset.service.version > 1) {
            asset.disabled = true;
          } else if (asset.service.type == 'heat') {
            process(asset);
          } else if (asset.service.type == 'murano') {
            asset.validated = true;
            asset.disabled = !$scope.has_murano;
            if ($scope.eversion_check(asset, $scope.murano_version) != true) {
              asset.disabled = true;
            }
          } else if (asset.service.type != 'glance' && asset.service.type != 'bundle') {
            asset.disabled = true;
          }
          asset.has_murano = $scope.has_murano;
        });
        $scope.glance_loaded = true;
        $scope.murano_loaded = true;
        updateFoundAssets($scope);
      }).error(function() {
        notifyError('There was an error while retrieving entries from the Application Catalog.');
      });
      if ($scope.has_murano) {
        muranoAPI.getPackages().success(function(data) {
          $scope.murano_packages = data;
          var muranoPackageDefinitions = {};
          angular.forEach(data.packages, function(pkg) {
            angular.forEach(pkg.class_definitions, function(definition) {
              muranoPackageDefinitions[definition] = {'id': pkg.id};
            });
          });
          $scope.murano_package_definitions = muranoPackageDefinitions;
          updateFoundAssets($scope);
        });
      }
      glanceAPI.getImages().success(function(data) {
        $scope.glance_images = data;
        var glanceNames = {};
        angular.forEach(data.items, function(item) {
          glanceNames[item.name] = {'id': item.id};
        });
        $scope.glance_names = glanceNames;
        updateFoundAssets($scope);
      });
    };
    this.update_selected_facets = function(selectedFacets) {
      $scope.selected_facets.length = 0;
      if (selectedFacets != undefined) {
        angular.forEach(selectedFacets, function(facet) {
          $scope.selected_facets.push(facet);
        });
      }
      $scope.update_assets_filtered();
    };
    this.update_selected_text = function(selectedText) {
      $scope.selected_text = selectedText;
      $scope.update_assets_filtered();
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
  function commonInit($scope, $modal, toast, appCatalogModel) {
    $scope.WEBROOT = WEBROOT;
    $scope.STATIC_URL = STATIC_URL;
    $scope.toggle_service_filter = appCatalogModel.toggle_service_filter;
    $scope.service_filters = appCatalogModel.service_filters;
    $scope.service_filters_selections = appCatalogModel.service_filters_selections;
    $scope.asset_filter_strings = appCatalogModel.asset_filter_strings;
    $scope.asset_filter_facets = appCatalogModel.asset_filter_facets;
    $scope.init = appCatalogModel.init;

    var retired = function() {
      var newscope = $scope.$new();
      var modal = $modal.open({
        templateUrl: STATIC_URL + "dashboard/project/app_catalog/retired_panel.html",
        scope: newscope
      });
      newscope.cancel = function() {
        modal.dismiss('');
      };
    };
    var error = function(message) {
      toast.add('error', message);
    };
    var deprecated = function(message) {
      toast.add('warning', message);
    };
    appCatalogModel.register_callback('error', error);
    appCatalogModel.register_callback('deprecated', deprecated);
    appCatalogModel.register_callback('retired', retired);
//FIXME probably belongs in its own directive...
    var textSearchWatcher = $scope.$on('textSearch', function(event, text) {
      appCatalogModel.update_selected_text(text);

    });
    var textSearchWatcher2 = $scope.$on('searchUpdated', function(event, query) {
      var selectedFacets;
      if (query != '') {
        selectedFacets = query.split('&');
        for (var i = 0; i < selectedFacets.length; i++) {
          var s = selectedFacets[i];
          var idx = s.indexOf('=');
          selectedFacets[i] = [s.slice(0, idx), s.slice(idx + 1)];
        }
      }
      appCatalogModel.update_selected_facets(selectedFacets);
    });
  }
  function appCatalogMagicSearchBar(basePath) {
    var directive = {
      compile: function (element, attrs) {
        /**
         * Need to set template here since MagicSearch template
         * attribute is not interpolated. Can't hardcode the
         * template location and need to use basePath.
         */
        var templateUrl = basePath + 'magic-search/magic-search.html';
        element.find('magic-search').attr('template', templateUrl);
        element.addClass('hz-magic-search-bar');
      },
      restrict: 'E',
      templateUrl: STATIC_URL + "dashboard/project/app_catalog/magic_search.html"
    };
    return directive;
  }

  function appCatalogTableCtrl($scope, $http, $timeout, $modal, toast, appCatalogModel) {
    $scope.assets = [];
    var update = function() {
      $scope.assets = [];
      angular.forEach(appCatalogModel.assets_filtered, function(asset) {
        if (typeof asset.tags !== "undefined" && asset.tags.indexOf('app') > -1) {
          $scope.assets.push(asset);
        }
      });
    };
    appCatalogModel.register_callback('update', update);
    commonInit($scope, $modal, toast, appCatalogModel);
    $scope.switcher = {pannel: 'app', active: 'grid'};
    $scope.changeActivePanel = function(name) {
      $scope.switcher.active = name;
    };
    $scope.details = function(asset) {
      var newscope = $scope.$new();
      newscope.asset = asset;
      var modal = $modal.open({
        templateUrl: STATIC_URL + "dashboard/project/app_catalog/details_panel.html",
        scope: newscope
      });
      newscope.cancel = function() {
        modal.dismiss('');
      };
    };
  }

  function appComponentCatalogTableCtrl($scope, $http, $timeout, $modal, toast, appCatalogModel) {
    $scope.assets = appCatalogModel.assets_filtered;
    var update = function() {
      $timeout(function() {
        $scope.assets = appCatalogModel.assets_filtered;
      }, 0, false);
    };
    appCatalogModel.register_callback('update', update);
    commonInit($scope, $modal, toast, appCatalogModel);
    $scope.switcher = {pannel: 'component', active: 'list'};
  }

  function updateFoundAssets($scope) {
    var i;
    if ('glance_loaded' in $scope && 'glance_names' in $scope) {
      for (i in $scope.assets) {
        if ($scope.assets[i].service.type != 'glance') {
          continue;
        }
        var name = $scope.assets[i].name;
        var isInstalled = name in $scope.glance_names;
        $scope.assets[i].installed = isInstalled;
        if (isInstalled) {
          $scope.assets[i].installed_id = $scope.glance_names[name].id;
        }
      }
    }
    if ('murano_loaded' in $scope && 'murano_package_definitions' in $scope) {
      for (i in $scope.assets) {
        if ($scope.assets[i].service.type != 'murano') {
          continue;
        }
        var definition = $scope.assets[i].service.package_name;
        var isInstalled = definition in ($scope.murano_package_definitions);
        $scope.assets[i].installed = isInstalled;
        if (isInstalled) {
          $scope.assets[i].service.murano_id = $scope.murano_package_definitions[definition].id;
        }
      }
    }
    var assetNameToAsset = {};
    angular.forEach($scope.assets, function(asset) {
      assetNameToAsset[asset.name] = asset;
    });
    angular.forEach($scope.assets, function(asset) {
      asset.disabled = false;
      if ('depends' in asset) {
        angular.forEach(asset.depends, function(dep) {
          dep.asset = assetNameToAsset[dep.name];
          if('disabled' in asset && dep.asset.disabled) {
            asset.disabled = true;
          }
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
      link: function(scope, element) {
        for (var i = 0; i < scope.value; i++) {
          element.append(star.clone());
        }
      }
    };
  }

/*FIXME move out to testing file.*/
  function test_evars($scope) {
    var assert = function(t, a, b) {
      if (!t) {
        console.log("Failed", a, b);
      }
    }
    assert($scope.eversion_check({service:{}}, [2014,1,1]), [], [2014,1,1]);
    assert($scope.eversion_check({service:{ever:[{min:[2014,1,1]}]}}, [2014,1,1]), [2014,1,1], [2014,1,1]);
    assert($scope.eversion_check({service:{ever:[{max:[2014,1,1]}]}}, [2014,1,1]), [2014,1,1], [2014,1,1]);
    assert(!$scope.eversion_check({service:{ever:[{max:[2014,1,1]}]}}, [2015,1,1]), [2014,1,1], [2015,1,1]);
    assert($scope.eversion_check({service:{ever:[{max:[2014,1,1]}]}}, [2013,1,1]), [2014,1,1], [2013,1,1]);
    assert(!$scope.eversion_check({service:{ever:[{min:[2016,1,1]}]}}, [2015,1,1]), [2016,1,1], [2015,1,1]);
    assert($scope.eversion_check({service:{ever:[{min:[2013,1,1]}]}}, [2014,1,1]), [2013,1,1], [2014,1,1]);
    assert($scope.eversion_check({service:{ever:[{min:[2013,1,1],max:[2015,1,1]}]}}, [2014,1,1]), [2013,2015], [2014,1,1]);
    assert(!$scope.eversion_check({service:{ever:[{min:[2013,1,1],max:[2015,1,1]}]}}, [2011,1,1]), [2013,2015], [2011,1,1]);
    assert(!$scope.eversion_check({service:{ever:[{min:[2013,1,1],max:[2015,1,1]}]}}, [2016,1,1]), [2013,2015], [2016,1,1]);
  }

})();
