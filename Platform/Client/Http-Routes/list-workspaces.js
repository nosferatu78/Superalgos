exports.newListWorkspacesRoute = function newListWorkspacesRoute() {
    const thisObject = {
        endpoint: 'ListWorkspaces',
        command: command
    }

    return thisObject

    function command(httpRequest, httpResponse) {
        let allWorkspaces = []
        let projects = SA.projects.foundations.utilities.filesAndDirectories.getDirectories(global.env.PATH_TO_PROJECTS)
        let projectsCount = 0

        for(let i = 0; i < projects.length; i++) {
            let project = projects[i]
            readPluginWorkspaces()

            function readPluginWorkspaces() {
                let pluginName = project
                if(global.env.PROJECT_PLUGIN_MAP[project] && global.env.PROJECT_PLUGIN_MAP[project].dir) pluginName = global.env.PROJECT_PLUGIN_MAP[project].dir
                let dirPath = global.env.PATH_TO_PLUGINS + '/' + pluginName + '/Workspaces'
                try {
                    let fs = SA.nodeModules.fs
                    fs.readdir(dirPath, onDirRead)

                    function onDirRead(err, fileList) {
                        let updatedFileList = []

                        if(err) {
                            /*
                            If we have a problem reading this folder we will assume that it is
                            because this project does not need this folder and that's it.
                            */
                            //SA.logger.warn('Error reading a directory content. filePath = ' + dirPath)
                        } else {
                            for(let i = 0; i < fileList.length; i++) {
                                let name = 'Plugin \u2192 ' + fileList[i]
                                updatedFileList.push([project, name])
                            }
                        }
                        allWorkspaces = allWorkspaces.concat(updatedFileList)
                        projectsCount++
                        if(projectsCount === projects.length) {
                            SA.logger.info(`${projectsCount} === ${projects.length}`)
                            readMyWorkspaces()
                        }
                    }
                } catch(err) {
                    SA.logger.error('Error reading a directory content. filePath = ' + dirPath)
                    SA.logger.error('err.stack = ' + err.stack)
                    SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                    return
                }
            }
        }

        function readMyWorkspaces() {
            let dirPath = global.env.PATH_TO_MY_WORKSPACES
            try {
                const nestedList = iterateDirectoryItems([dirPath])
                allWorkspaces = allWorkspaces.concat(nestedList.map(list => {
                    list.splice(0, 1, '')
                    return list
                }))
                SA.logger.info('my-workspace file list ' + JSON.stringify(allWorkspaces))
                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(allWorkspaces), httpResponse)
                // let fs = SA.nodeModules.fs
                // fs.readdir(dirPath, onDirRead)

                // function onDirRead(err, fileList) {
                //     if(err) {
                //         // This happens the first time you run the software.
                //         SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(allWorkspaces), httpResponse)
                //         return
                //     } else {
                //         let updatedFileList = []
                //         for(let i = 0; i < fileList.length; i++) {
                //             let name = fileList[i]
                //             updatedFileList.push(['', name])
                //         }
                //         allWorkspaces = allWorkspaces.concat(updatedFileList)
                //         SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(allWorkspaces), httpResponse)
                //         return
                //     }
                // }
            } catch(err) {
                SA.logger.error('Error reading a directory content. filePath = ' + dirPath)
                SA.logger.error('err.stack = ' + err.stack)
                SA.projects.foundations.utilities.httpResponses.respondWithContent(JSON.stringify(global.DEFAULT_FAIL_RESPONSE), httpResponse)
                return
            }
        }

        /**
         * 
         * @param {string[]} dirPath 
         * @return {string[][]}
         */
        function iterateDirectoryItems(dirPath) {
            const fs = SA.nodeModules.fs
            let results = []
            const topPath = SA.nodeModules.path.join(...dirPath)
            const items = fs.readdirSync(topPath)
            for(let i = 0; i < items.length; i++) {
                const name = SA.nodeModules.path.join(topPath, items[i])
                if(fs.lstatSync(name).isDirectory()) {
                    results = results.concat(iterateDirectoryItems([...dirPath, items[i]]))
                }
                else {
                    results.push([...dirPath, items[i]])
                }
            }
            return results
        }
    }
}