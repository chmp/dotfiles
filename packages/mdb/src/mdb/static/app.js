
Vue.component('view-path', {
    props: ['path'],
    template: `
        <div>
            <navigation
                v-if="isAvailable"
                v-bind:path="displayPath"
                v-bind:isDirectory="isDirectory"
            ></navigation>
            <view-markdown-file v-if="isAvailable && isMarkdownFile" v-bind:path="path"></view-markdown-file>
            <view-notebook-file v-else-if="isAvailable && isNotebookFile" v-bind:path="path"></view-notebook-file>
            <view-directory v-else-if="isAvailable" v-bind:path="path"></view-directory>
        </div>
    `,
    computed: {
        isAvailable: function() {
            return this.path != null;
        },
        isMarkdownFile: function() {
            return (this.path || '').endsWith('.md');
        },
        isNotebookFile: function() {
            return (this.path || '').endsWith('.ipynb');
        },
        isDirectory: () => {
            var p = (this.path || '');
            return !(p.endsWith('.md') || p.endsWith('.ipynb'));
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
                return content.content.reduce(
                    (curr, file) => {
                        if(file.toLowerCase() == './readme.md') {
                            return file;
                        }
                        else if (file.toLowerCase() == './index.md') {
                            return file;
                        }
                        else {
                            return curr;
                        }
                    },
                    '.',
                );
            })
            .catch(console.error);
        }
    }
})

Vue.component('navigation', {
    props: ['path', 'isDirectory'],
    template: `
        <ul class='navigation'>
            <li><router-link v-bind:to="'/home'"> &#127968;</router-link></li>
            <li><button v-on:click="open">&#128193;</button></li>
            <li v-if="isDirectory" v-on:click="newFile"><button>+</button></li>
            <li><router-link v-bind:to="'/view/' + path">{{path}}</router-link></li>
        </ul>
    `,
    methods: {
        open: function() {
            this.$http.get('/open/' + this.path);
        },
        newFile: function() {
            var child = prompt('filename');

            if(child != null) {
                this.$http.get('/new/' + this.path + '/' + child);
            }
        }
    },
    computed: {
        hasParent: function() {

        }
    }
})

Vue.component('view-directory', {
    props: ['path'],
    template: `
        <ul class="directory">
            <li v-for="file in files" v-bind:class="{ file: file.isFile }">
                <router-link v-bind:to="'/view/' + file.path">{{ file.path }}</router-link>
            </li>
        </ul>
    `,
    asyncComputed: {
        'files': function() {
            console.log('fetch ', this.path);
            return this.$http.get('/tree/' + this.path)
            .then(content => content.json())
            .then(content => {
                content = content.content.map(file => ({
                    path: file,
                    isFile: file.endsWith('.md') || file.endsWith('.ipynb'),
                }));

                content.sort((a, b) => a.isFile - b.isFile);
                return content;
            })
            .catch(console.error);
        }
    }
});

Vue.component('view-markdown-file', {
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

Vue.component('view-notebook-file', {
    props: ['path'],
    template: `
        <div class="notebook">
            <button v-on:click="showSource = !showSource">Toggle Source</button>
            <notebook-cell
                v-for="cell in cells"
                v-bind:key="cell['key']"
                v-bind:data="cell"
                v-bind:showSource="showSource"
            >
            </notebook-cell>
        </div>
    `,
    data: () => ({
        showSource: false,
    }),
    asyncComputed: {
        cells: function() {
            console.log('fetch ', this.path);
            return this.$http.get('/tree/' + this.path)
            .then(content => content.json())
            .then(content => content.content)
            .then(content => JSON.parse(content))
            .then(content => parseNotebook(content))
            .catch(console.error);
        }
    }
});


function parseNotebook(content) {
    window.content = content;

    // TODO: check version, normalize formats ...
    return content['cells'].map((item, index) => {
        item['key'] = index;

        item['outputs'] = (item['outputs'] || []).map((output, index) => {
            output['key'] = index;
            return output;
        });
        return item;
    });
}

Vue.component('notebook-cell', {
    props: ['data', 'showSource'],
    template: `
        <notebook-cell-code
            v-if="data['cell_type'] == 'code'"
            v-bind:source="data['source']"
            v-bind:outputs="data['outputs']"
            v-bind:showSource="showSource"
            >
        </notebook-cell-code>
        <notebook-cell-markdown
            v-else-if="data['cell_type'] == 'markdown'"
            v-bind:source="data['source']"
            >
        </notebook-cell-markdown>
        <div v-else="" style="color: red;">unknown cell type: {{data['cell_type']}}</div>
    `,
});

Vue.component('notebook-cell-code', {
    props: ['source', 'outputs', 'showSource'],
    template: `
        <div class="notebook-cell-code">
            <div v-if="showSource" class="source">
                <pre><code><span v-for="line in source">{{line}}</span></code></pre>
            </div>
            <div class="outputs">
                <notebook-output
                    v-for="output in outputs"
                    v-bind:key="output['key']"
                    v-bind:data="output"
                >
                </notebook-output>
            </div>
        </div>
    `,
});

Vue.component('notebook-cell-markdown', {
    props: ['source'],
    template: `
        <div>
            <render-markdown
                v-bind:content="source.join('\\n')"
                v-bind:path="'.'"
            >
            </render-markdown>
        </div>
    `,
});

Vue.component('notebook-output', {
    props: ['data'],
    template: `
        <div class="notebook-output">
            <notebook-output-stream
                v-if="data['output_type'] == 'stream'"
                v-bind:text="data['text']"
            >
            </notebook-output-stream>
            <notebook-output-display-data
                v-else-if="data['output_type'] == 'display_data'"
                v-bind:data="data['data']"
            >
            </notebook-output-display-data>
            <notebook-output-display-data
                v-else-if="data['output_type'] == 'execute_result'"
                v-bind:data="data['data']"
            >
            </notebook-output-display-data>
            <div v-else="" style="color: red;">unknown output type: {{data['output_type']}}</div>
        </div>
    `,
});

Vue.component('notebook-output-stream', {
    props: ['text'],
    template: `
        <div class="notebook-output-stream">
            <pre><span v-for="line in text">{{line}}</span></pre>
        </div>
    `,
});

Vue.component('notebook-output-display-data', {
    props: ['data'],
    template: `
        <div class="notebook-output-display-data">
            <img
                v-if="'image/png' in data"
                v-bind:src="'data:image/png;base64,' + data['image/png']"
            >
            <div
                v-else-if="'text/html' in data"
                v-html="data['text/html'].join('\\n')"
            >
            </div>
            <div v-else="">
                No known display data type in {{Object.keys(data).join(' ')}}
            </div>
            </img>
        </div>
    `,
})

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
        { path: '/view/', component: {template: '<view-path path="."></view-path>' } },
        { path: '/view/:path*', component: {template: '<view-path v-bind:path="$route.params.path"></view-path>' } },
    ]
})

const app = new Vue({
  router
}).$mount('#app')
