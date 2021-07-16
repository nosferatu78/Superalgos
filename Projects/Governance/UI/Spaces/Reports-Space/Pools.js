function newGovernanceReportsPools() {
    let thisObject = {
        addHTML: addHTML,
        initialize: initialize,
        finalize: finalize
    }

    return thisObject

    function initialize() {

    }

    function finalize() {

    }

    function addHTML(tabIndex, filters) {
        return UI.projects.governance.utilities.commonTables.addHTML(
            'pools',
            'Pool',
            'Pools',
            tabIndex, 
            filters
        )
    }
}