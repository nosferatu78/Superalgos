runRoot()

const EXPORT_DOCS_DIR = './Exports/Docs'

async function runRoot() {
  /*
  Setting up external dependencies.
  */
  global.SA = {
    projects: {
      foundations: {
        utilities: {
          filesAndDirectories: require('./Projects/Foundations/SA/Utilities/FilesAndDirectories').newFoundationsUtilitiesFilesAndDirectories(),
          icons: require('./Projects/Foundations/SA/Utilities/Icons').newFoundationsUtilitiesIcons()
        },
        globals: {
          schemas: {
            APP_SCHEMA_MAP: new Map()
          }
        }
      }
    },
    nodeModules: {
      fs: require('fs'),
      util: require('util'),
      path: require('path'),
      jsDom: require('jsdom').JSDOM
    }
  }

  global.ED = {
    DEFAULT_LANGUAGE: 'EN',
    menuLabelsMap: new Map(),
    exporter: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationExporter').documentationExporter(),
    utilities: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationGenerationUtilities').documentGenerationUtilities(),
    designSpace: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationDesignSpace').documentationDesignSpace(),
    strings: require(EXPORT_DOCS_DIR + '/Scripts/DocumentationStringsUtilities').documentationStringsUtilities(),
    indexFile: EXPORT_DOCS_DIR + '/index.html',
    baseIndexFile: EXPORT_DOCS_DIR + '/index.html'
  }


  /* Load Environment Variables */
  let ENVIRONMENT = require('./Environment.js')
  let ENVIRONMENT_MODULE = ENVIRONMENT.newEnvironment()
  global.env = ENVIRONMENT_MODULE
  global.env.EXPORT_DOCS_DIR  = EXPORT_DOCS_DIR
  
  if(process.argv.length > 2) {
    global.env.PATH_TO_PAGES_DIR = process.argv[2]
    global.env.REMOTE_DOCS_DIR = process.argv[3] || process.argv[2]
  }

  /*
  First thing is to load the project schema file.
  */
  global.PROJECTS_SCHEMA = require(global.env.PATH_TO_PROJECT_SCHEMA)
  global.SCHEMAS_BY_PROJECT = new Map()

  /*
  Version Management
  */
  SA.version = require('./package.json').version


  run()

  async function run() {
    ED.app = require(EXPORT_DOCS_DIR + '/ExportDocumentationApp.js').newExportDocumentationApp()
    console.log('Superalgos documentation is exporting!')
    await ED.app.run()
    console.log('Superalgos documentation has exported!')

    const robots = `User-agent: *\nDisallow: /`
    SA.nodeModules.fs.writeFileSync(global.env.PATH_TO_PAGES_DIR + '/robots.txt', robots)

  }
}