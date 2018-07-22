
Vue.component('view-path', {
    props: ['path'],
    template: `
        <div>
            <navigation v-if="isAvailable" v-bind:path="displayPath"></navigation>
            <view-directory v-if="isAvailable && !isFile" v-bind:path="path"></view-directory>
            <view-file v-else-if="isAvailable" v-bind:path="path"></view-file>
        </div>
    `,
    computed: {
        isAvailable: function() {
            return this.path != null;
        },
        isFile: function() {
            return (this.path || '').endsWith('.md');
        },
        displayPath: function() {
            if(this.path == '') {
                return '.';
            }
            return this.path;
        }
    },
})

Vue.component('view-home', {
    template: `
        <div>
            <view-path v-bind:path="homeTarget"></view-path>
        </div>
    `,
    asyncComputed: {
        homeTarget: function() {
            console.log('fetch ', '/tree');
            return this.$http.get('/tree')
            .then(content => content.json())
            .then(content => {
                if(content.content.some(file => file == './Index.md')) {
                    return 'Index.md';
                }
                else {
                    return '.';
                }
            })
            .catch(console.error);
        }
    }
})

Vue.component('navigation', {
    props: ['path'],
    template: `
        <ul class='navigation'>
            <li><router-link v-bind:to="'/home'"> &#127968;</router-link></li>
            <li><router-link v-bind:to="'/view/' + path">{{path}}</router-link></li>
        </ul>
    `,
    computed: {
        hasParent: function() {

        }
    }
})

Vue.component('view-directory', {
    props: ['path'],
    template: `
        <ul>
            <li v-for="file in files">
                <router-link v-bind:to="'/view/' + file.path">{{ file.path }}</router-link>
            </li>
        </ul>
    `,
    asyncComputed: {
        'files': function() {
            console.log('fetch ', this.path);
            return this.$http.get('/tree/' + this.path)
            .then(content => content.json())
            .then(content => content.content.map(file => {
                return {
                    path: file,
                    isFile: file.endsWith('.md'),
                };
            }))
            .catch(console.error);
        }
    }
});

Vue.component('view-file', {
    props: ['path'],
    template: `
        <render-markdown v-bind:path="path" v-bind:content="content">
        </render-markdown>
    `,
    asyncComputed: {
        content: function() {
            console.log('fetch ', this.path);
            return this.$http.get('/tree/' + this.path)
            .then(content => content.json())
            .then(content => content.content)
            .catch(console.error);
        }
    }
});

Vue.component('render-markdown', {
    props: ['content', 'path'],
    template: `<div v-html="rendered"></div>`,
    computed: {
        rendered: function() {
            if(!this.content) {
                return '';
            }
            var reader = new commonmark.Parser();
            var writer = new CustomRenderer({
                urlPrefix: '#/view/',
                basePath: this.path,
            });
            var parsed = reader.parse(this.content);
            var rendered = writer.render(parsed);
            return rendered;
        }
    },
})


function CustomRenderer(options) {
    this.urlPrefix = options.urlPrefix || '';
    options.urlPrefix = undefined;

    this.basePath = options.basePath || null;
    options.basePath = undefined;

    commonmark.HtmlRenderer.call(this, options);
}

CustomRenderer.prototype = Object.create(commonmark.HtmlRenderer.prototype);

CustomRenderer.prototype.link = function(node, entering) {
    // copied and adapted from
    // https://github.com/commonmark/commonmark.js/blob/master/lib/render/html.js
    var attrs = this.attrs(node);
    if (entering) {
        if (!(this.options.safe && potentiallyUnsafe(node.destination))) {
            attrs.push(['href', this.formatLink(node)]);
        }
        if (node.title) {
            attrs.push(['title', this.esc(node.title, true)]);
        }
        this.tag('a', attrs);
    } else {
        this.tag('/a');
    }
}

CustomRenderer.prototype.formatLink = function(node) {
    const normalizeDestination = (destination) => {
        if(destination.startsWith('/')) {
            return destination
        }

        const index = this.basePath.lastIndexOf('/');

        if(index == -1) {
            return destination;
        }

        return skipDotSegments(this.basePath.slice(0, index) + '/' + destination);
    }

    // remove '.' and '..' from a path
    const skipDotSegments = (path) => {
        const impl = (path) => {
            if(path.length == 0) {
                return [];
            }

            if(path[0] == '.') {
                return impl(path.slice(1));
            }
            if(path[1] == '..') {
                return impl(path.slice(2));
            }
            return [
                path[0],
                ...impl(path.slice(1))
            ];
        }

        return impl(path.split('/')).join('/');
    }


    return this.urlPrefix + this.esc(normalizeDestination(node.destination), true);

}

const router = new VueRouter({
    routes: [
        { path: '/', component: {template: '<view-path path=""></view-path>' } },
        { path: '/home', component: {template: '<view-home></view-home>' } },
        { path: '/view/:path*', component: {template: '<view-path v-bind:path="$route.params.path"></view-path>' } },
    ]
})

const app = new Vue({
  router
}).$mount('#app')
