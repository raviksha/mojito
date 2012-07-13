/*
 * Copyright (c) 2011-2012, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
YUI.add('mojito-ycb-tests', function(Y, NAME) {

    var libpath = require('path'),
        libfs = require('fs'),
        libycb = require(libpath.join(__dirname, '../../../libs/ycb.js')),
        suite = new YUITest.TestSuite(NAME),
        A = YUITest.Assert,
        AA = YUITest.ArrayAssert;


    function readFixtureFile(file){
        var path = libpath.join(__dirname, '../../', 'fixtures/ycb' , file);
        var data = libfs.readFileSync(path, 'utf8');
        return Y.JSON.parse(data);
    }


    suite.add(new YUITest.TestCase({

        name: 'ycb',

        setUp: function() {},

        tearDown: function() {},


        'test if we can use the module': function() {
            A.isTrue(libycb.version === '2.0.0');
        },


        'test _flattenDimension': function() {
            var dims = readFixtureFile('dimensions.json'),
                ycb = new libycb.Ycb(dims),
                flat = ycb._flattenDimension('', dims[0].dimensions[6]['lang']);

            A.areSame('en', flat['en']);
            A.areSame('en_CA', flat['en/en_CA']);
            A.areSame('fr', flat['fr']);
            A.areSame('fr_CA', flat['fr/fr_FR/fr_CA']);
        },


        'test _flattenDimensions': function() {
            var dims = readFixtureFile('dimensions.json'),
                ycb = new libycb.Ycb(dims),
                flat = ycb._dimensionPaths;

            A.areSame('en', flat['lang']['en']);
            A.areSame('en_CA', flat['lang']['en/en_CA']);
            A.areSame('fr', flat['lang']['fr']);
            A.areSame('fr_CA', flat['lang']['fr/fr_FR/fr_CA']);
        },


        'test _makeOrderedLookupList': function() {
            var dims = readFixtureFile('dimensions.json'),
                ycb = new libycb.Ycb(dims),
                context, list;
            context = {
                'region': 'ir',
                'environment': 'preproduction',
                'lang': 'fr_CA'
            };
            list = ycb._makeOrderedLookupList(context);

            A.areSame('preproduction', list['environment'][0]);
            A.areSame('*', list['environment'][1]);
            A.areSame('fr_CA', list['lang'][0]);
            A.areSame('fr_FR', list['lang'][1]);
            A.areSame('fr', list['lang'][2]);
            A.areSame('*', list['lang'][3]);
            A.areSame('ir', list['region'][0]);
            A.areSame('gb', list['region'][1]);
            A.areSame('*', list['region'][2]);
        },


        'test _getLookupPath': function() {
            var dims = readFixtureFile('dimensions.json'),
                ycb = new libycb.Ycb(dims),
                context, path;
            context = {
                'region': 'ir',
                'environment': 'preproduction',
                'lang': 'fr_FR'
            };
            path = ycb._getLookupPath(context);

            A.areSame('preproduction/*/*/*/*/*/fr_FR/ir/*/*/*', path);
        },


        'test _getLookupPaths': function() {
            var dims = readFixtureFile('dimensions.json'),
                ycb = new libycb.Ycb(dims),
                context, paths, expected;
            context = {
                'region': 'ir',
                'environment': 'preproduction',
                'lang': 'fr_FR'
            };
            paths = ycb._getLookupPaths(context);

            expected = [
                "*/*/*/*/*/*/*/*/*/*/*",
                "*/*/*/*/*/*/*/gb/*/*/*",
                "*/*/*/*/*/*/*/ir/*/*/*",
                "*/*/*/*/*/*/fr/*/*/*/*",
                "*/*/*/*/*/*/fr/gb/*/*/*",
                "*/*/*/*/*/*/fr/ir/*/*/*",
                "*/*/*/*/*/*/fr_FR/*/*/*/*",
                "*/*/*/*/*/*/fr_FR/gb/*/*/*",
                "*/*/*/*/*/*/fr_FR/ir/*/*/*",
                "preproduction/*/*/*/*/*/*/*/*/*/*",
                "preproduction/*/*/*/*/*/*/gb/*/*/*",
                "preproduction/*/*/*/*/*/*/ir/*/*/*",
                "preproduction/*/*/*/*/*/fr/*/*/*/*",
                "preproduction/*/*/*/*/*/fr/gb/*/*/*",
                "preproduction/*/*/*/*/*/fr/ir/*/*/*",
                "preproduction/*/*/*/*/*/fr_FR/*/*/*/*",
                "preproduction/*/*/*/*/*/fr_FR/gb/*/*/*",
                "preproduction/*/*/*/*/*/fr_FR/ir/*/*/*"
            ];
            AA.itemsAreEqual(expected, paths);
        },


        'test _processRawBundle': function() {
            var bundle, ycb;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json')[0]);
            ycb = new libycb.Ycb(bundle),

            A.areSame('YRB_YAHOO', ycb.settings['*/*/*/*/*/*/*/*/*/*/*'].title_key);
            A.isNotUndefined(ycb.dimensions[7].region.us);
        },


        'test _processRawBundle with dupe error': function() {
            var bundle, ycb;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'))
                     .concat(readFixtureFile('simple-2.json'));

            // This should throw an error for us to trap
            try {
                ycb = new libycb.Ycb(bundle);
            } catch(err) {
                A.isTrue(true);
                return;
            }
            A.isTrue(false);
        },


        'test _processRawBundle with many settings': function() {
            var bundle, ycb;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'))
                     .concat(readFixtureFile('simple-3.json'));
            ycb = new libycb.Ycb(bundle);

            A.areSame('YRB_YAHOO', ycb.settings['*/*/*/*/*/*/*/*/*/*/*'].title_key);
            A.areSame('http://fr.yahoo.com', ycb.settings['*/*/*/*/*/*/*/fr/*/*/*'].links.home);
            A.areSame('yahoo_bt_FR.png', ycb.settings['*/*/*/*/*/*/*/fr/*/*/bt'].logo);
            A.isNotUndefined(ycb.dimensions[7].region.us);
        },


        'test _applySubstitutions': function() {
            var config, ycb;
            config = readFixtureFile('substitutions.json');
            ycb = new libycb.Ycb([]);
            ycb._applySubstitutions(config);

            A.isTrue(config.key0.key4 === 'The value of key0.key2 is value2');
            A.isTrue(config.key5.key4 === 'The value of key0.key2 is value2');
            A.isTrue(config.key6.key7.key8.key4 === 'The value of key0.key2 is value2');
            A.isTrue(config.key6.key9[2] === 'The value of key0.key2 is value2');
            A.isTrue(config['$$key0.key1$$'] === '--YCB-SUBSTITUTION-ERROR--');
            A.isTrue(config.key10.key11.key4 === 'The value of key0.key2 is value2');
            A.isTrue(config.key11[4] === 'The value of key0.key2 is value2');
            A.isTrue(config.key8.key4 === 'The value of key0.key2 is value2');
        },


        'test if we can use a simple config': function() {
            var bundle, config;
            bundle = readFixtureFile('simple-1.json');
            config = libycb.read(bundle);

            A.areSame('YRB_YAHOO', config.title_key);
            A.areSame('http://www.yahoo.com', config.links.home);
            A.areSame('http://mail.yahoo.com', config.links.mail);
        },


        'test if we can use a simple config with dimensions': function() {
            var bundle, config;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'));
            config = libycb.read(bundle);

            A.areSame('YRB_YAHOO', config.title_key);
            A.areSame('http://www.yahoo.com', config.links.home);
            A.areSame('http://mail.yahoo.com', config.links.mail);
        },


        'test if we can use a simple config with dimensions and extra settings': function() {
            var bundle, config;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'))
                     .concat(readFixtureFile('simple-3.json'));
            config = libycb.read(bundle);

            A.areSame('YRB_YAHOO', config.title_key);
            A.areSame('http://www.yahoo.com', config.links.home);
            A.areSame('http://mail.yahoo.com', config.links.mail);
        },


        'test if we can use a simple config with dimensions and conext IR': function() {
            var bundle, context, config;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'))
                     .concat(readFixtureFile('simple-3.json'));
            context = {
                'region': 'ir',
                'environment': 'preproduction',
                'lang': 'fr_FR'
            };
            config = libycb.read(bundle, context);

            A.areSame('YRB_YAHOO', config.title_key);
            A.areSame('yahoo_FR.png', config.logo);
            A.areSame('http://gb.yahoo.com', config.links.home);
            A.areSame('http://gb.mail.yahoo.com', config.links.mail);
        },


        'test if we can use a simple config with dimensions and conext FR': function() {
            var bundle, context, config;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'))
                     .concat(readFixtureFile('simple-3.json'));
            context = {
                'region': 'fr',
                'environment': 'preproduction',
                'lang': 'fr_FR'
            };
            config = libycb.read(bundle, context);

            A.areSame('YRB_YAHOO', config.title_key);
            A.areSame('yahoo_FR.png', config.logo);
            A.areSame('http://fr.yahoo.com', config.links.home);
            A.areSame('http://fr.mail.yahoo.com', config.links.mail);
        },


        'test if we can use a simple config with dimensions and conext GB & BT': function() {
            var bundle, context, config;
            bundle = readFixtureFile('dimensions.json')
                     .concat(readFixtureFile('simple-1.json'))
                     .concat(readFixtureFile('simple-3.json'));
            context = {
                'region': 'gb',
                'environment': 'preproduction',
                'flavor': 'bt'
            };
            config = libycb.read(bundle, context);

            A.areSame('YRB_YAHOO', config.title_key);
            A.areSame('yahoo_bt_GB.png', config.logo);
            A.areSame('http://gb.yahoo.com', config.links.home);
            A.areSame('http://gb.mail.yahoo.com', config.links.mail);
        },


        'test ycb accepts falsey config values': function() {
            var bundle,
                config,
                foo = {
                    settings: [ 'master' ],
                    title_key: 'YRB_YAHOO',
                    'data-url': 'http://service.yahoo.com',
                    logo: 'yahoo.png',
                    false_ok: false,
                    zero: 0,
                    undef: undefined,
                    links: { home: 'http://www.yahoo.com', mail: 'http://mail.yahoo.com' }
                };

            bundle = readFixtureFile('dimensions.json').concat([foo]);
            config = libycb.read(bundle);

            A.areEqual(config['data-url'], foo['data-url']);
            A.isTrue('false_ok' in config);
            A.areEqual(config.false_ok, foo.false_ok);
            A.isTrue('undef' in config);
            A.areEqual(config.undef, foo.undef);
            A.isTrue('zero' in config);
            A.areEqual(config.zero, foo.zero);
        }


    }));


    YUITest.TestRunner.add(suite);

}, '0.0.1', {requires: ['json']});
