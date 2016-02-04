#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

from openstack_dashboard.test.integration_tests import helpers


class TestComponents(helpers.TestCase):

    def setUp(self):
        super(TestComponents, self).setUp()
        self.home_pg.go_to_catalog_componentspage()

    def test_components(self):
        self._save_screenshot(None)
        # TODO(markvan): Place holder for tests

    def tearDown(self):
        super(TestComponents, self).tearDown()
