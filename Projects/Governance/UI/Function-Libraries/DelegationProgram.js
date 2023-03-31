function newGovernanceFunctionLibraryDelegationProgram() {
    let thisObject = {
        calculate: calculate
    }
    const MAX_GENERATIONS = 3

    return thisObject

    function calculate(
        pools,
        userProfiles
    ) {
        /*
        We will first reset all the delegate power, and then distribute it.
        */
        for (let i = 0; i < userProfiles.length; i++) {
            let userProfile = userProfiles[i]

            if (userProfile.tokenPowerSwitch === undefined) { continue }
            let program = UI.projects.governance.utilities.validations.onlyOneProgram(userProfile, "Delegation Program")
            if (program === undefined) { continue }
            if (program.payload === undefined) { continue }

            resetProgram(program)
        }
        for (let i = 0; i < userProfiles.length; i++) {
            let userProfile = userProfiles[i]

            if (userProfile.tokenPowerSwitch === undefined) { continue }
            let program = UI.projects.governance.utilities.validations.onlyOneProgram(userProfile, "Delegation Program")
            if (program === undefined) { continue }
            if (program.payload === undefined) { continue }

            program.payload.delegationProgram.programPower = program.payload.tokenPower

            distributeProgram(program)
        }

        /* Bonus Calculation is here */
        UI.projects.governance.utilities.bonusProgram.run(
            pools,
            userProfiles,
            "delegationProgram",
            "Delegation-Bonus",
            "Delegation Program"
        )

        function resetProgram(node) {
            resetNode(node, 0)

            function resetNode(node, generation) {

                if (generation >= MAX_GENERATIONS) {
                    return
                }
                if (node === undefined) { return }
                if (node.payload === undefined) { return }
                if (node.payload.delegationProgram === undefined) {
                    node.payload.delegationProgram = {
                        programPower: 0,
                        ownPower: 0,
                        usedPower: 0
                    }
                } else {
                    node.payload.delegationProgram.programPower = 0
                    node.payload.delegationProgram.ownPower = 0
                    node.payload.delegationProgram.usedPower = 0
                }

                if (node.type === 'User Profile') {
                    return
                }
                if (node.payload.referenceParent !== undefined) {
                    resetNode(node.payload.referenceParent, generation + 1)
                    return
                }
                let schemaDocument = getSchemaDocument(node)
                if (schemaDocument === undefined) { return }

                if (schemaDocument.childrenNodesProperties !== undefined) {
                    for (let i = 0; i < schemaDocument.childrenNodesProperties.length; i++) {
                        let property = schemaDocument.childrenNodesProperties[i]

                        switch (property.type) {
                            case 'node': {
                                let childNode = node[property.name]
                                resetNode(childNode, generation)
                            }
                                break
                            case 'array': {
                                let propertyArray = node[property.name]
                                if (propertyArray !== undefined) {
                                    for (let m = 0; m < propertyArray.length; m++) {
                                        let childNode = propertyArray[m]
                                        resetNode(childNode, generation)
                                    }
                                }
                                break
                            }
                        }
                    }
                }
            }
        }

        function distributeProgram(programNode) {
            if (programNode.payload === undefined) { return }

            /*
            Here we will convert Token Power into programPower. 
            As per system rules programPower = tokensPower
            */
            let programPower = programNode.payload.tokenPower
            /*
            The Own Power is the power generated by the same User Profile tokens, not inherited from others.
            */
            programNode.payload.delegationProgram.ownPower = programPower
            distributeProgramPower(programNode, programNode, programPower, undefined, 0)

            function distributeProgramPower(
                currentProgramNode,
                node,
                programPower,
                percentage,
                generation
            ) {
                if (generation >= MAX_GENERATIONS) {
                    return
                }
                if (node === undefined) { return }
                if (node.payload === undefined) { return }
                if (node.payload.delegationProgram === undefined) { return }

                node.payload.delegationProgram.programPower = node.payload.delegationProgram.programPower + programPower
                drawPower(node, node.payload.delegationProgram.programPower, percentage)
                /*
                When we reach certain node types, we will halt the distribution, because these are targets for 
                delegate power.
                */
                if (
                    node.type === 'User Profile'
                ) {
                    return
                }
                /*
                If there is a reference parent defined, this means that the delegate power is 
                transferred to it and not distributed among children.
                */
                if (
                    node.payload.referenceParent !== undefined &&
                    node.type === 'User Delegate'
                ) {
                    currentProgramNode.payload.delegationProgram.usedPower = currentProgramNode.payload.delegationProgram.usedPower + programPower
                    distributeProgramPower(
                        currentProgramNode, 
                        node.payload.referenceParent, 
                        programPower / 10,
                        undefined,
                        generation + 1
                        )
                    return
                }
                /*
                If there is no reference parent we will redistribute delegate power among children.
                */
                let schemaDocument = getSchemaDocument(node)
                if (schemaDocument === undefined) { return }

                if (schemaDocument.childrenNodesProperties !== undefined) {
                    /*
                    Before distributing the delegate power, we will calculate how the power 
                    is going to be switched between all nodes. The first pass is about
                    scanning all sibling nodes to see which ones have a percentage defined
                    at their config, and check that all percentages don't add more than 100.
                    */
                    let totalPercentage = 0
                    let totalAmount = 0
                    let totalNodesWithoutPercentage = 0
                    for (let i = 0; i < schemaDocument.childrenNodesProperties.length; i++) {
                        let property = schemaDocument.childrenNodesProperties[i]

                        switch (property.type) {
                            case 'node': {
                                let childNode = node[property.name]
                                if (childNode === undefined) { continue }
                                if (childNode.type === 'Tokens Bonus') { continue }
                                let config = UI.projects.governance.utilities.nodeCalculations.getDistributionConfig(childNode, false)
                                if (config?.type === "amount" && config?.value >= 0) {
                                    totalAmount = totalAmount + config.value
                                } else if (config?.type === "percentage" && config?.value >= 0) {
                                    totalPercentage = totalPercentage + config.value
                                } else {
                                    totalNodesWithoutPercentage++
                                }  
                            }
                                break
                            case 'array': {
                                let propertyArray = node[property.name]
                                if (propertyArray !== undefined) {
                                    for (let m = 0; m < propertyArray.length; m++) {
                                        let childNode = propertyArray[m]
                                        if (childNode === undefined) { continue }
                                        if (childNode.type === 'Tokens Bonus') { continue }
                                        let config = UI.projects.governance.utilities.nodeCalculations.getDistributionConfig(childNode, false)
                                        if (config?.type === "amount" && config?.value >= 0) {
                                            totalAmount = totalAmount + config.value
                                        } else if (config?.type === "percentage" && config?.value >= 0) {
                                            totalPercentage = totalPercentage + config.value
                                        } else {
                                            totalNodesWithoutPercentage++
                                        }
                                    }
                                }
                                break
                            }
                        }
                    }
                    if (totalPercentage > 100) {
                        node.payload.uiObject.setErrorMessage(
                            'Delegate Power Switching Error. Total Percentage of children nodes is greater that 100.',
                            UI.projects.governance.globals.designer.SET_ERROR_COUNTER_FACTOR
                            )
                        return
                    }
                    let defaultPercentage = 0
                    if (totalNodesWithoutPercentage > 0) {
                        defaultPercentage = (100 - totalPercentage) / totalNodesWithoutPercentage
                    }
                    /* If configured Amounts exceed the available Program Power, determine the share by which requests need to be reduced.
                    Store the Program Power remaining for distribution via percentages after all amount requests have been served in percentagePower. */
                    let percentagePower = 0
                    let amountShare = 1
                    if (totalAmount > programPower && totalAmount > 0) {
                        amountShare = programPower / totalAmount
                    } else {
                        percentagePower = programPower - totalAmount
                    }
                    /*
                    Here we do the actual distribution.
                    */
                    for (let i = 0; i < schemaDocument.childrenNodesProperties.length; i++) {
                        let property = schemaDocument.childrenNodesProperties[i]

                        switch (property.type) {
                            case 'node': {
                                let childNode = node[property.name]
                                if (childNode === undefined) { continue }
                                if (childNode.type === 'Tokens Bonus') { continue }
                                let distributionAmount = 0
                                let percentage = 0
                                let config = UI.projects.governance.utilities.nodeCalculations.getDistributionConfig(childNode, false)
                                if (config?.type === "amount" && config?.value >= 0) {
                                    distributionAmount = config.value * amountShare
                                    percentage = "fixed"
                                } else if (config?.type === "percentage" && config?.value >= 0) {
                                    distributionAmount = percentagePower * config.value / 100
                                    percentage = config.value
                                } else {
                                    distributionAmount = percentagePower * defaultPercentage / 100
                                    percentage = defaultPercentage
                                }
                                distributeProgramPower(
                                    currentProgramNode, 
                                    childNode, 
                                    distributionAmount, 
                                    percentage,
                                    generation
                                    )
                            }
                                break
                            case 'array': {
                                let propertyArray = node[property.name]
                                if (propertyArray !== undefined) {
                                    for (let m = 0; m < propertyArray.length; m++) {
                                        let childNode = propertyArray[m]
                                        if (childNode === undefined) { continue }
                                        if (childNode.type === 'Tokens Bonus') { continue }
                                        let distributionAmount = 0
                                        let percentage = 0
                                        let config = UI.projects.governance.utilities.nodeCalculations.getDistributionConfig(childNode, false)
                                        if (config?.type === "amount" && config?.value >= 0) {
                                            distributionAmount = config.value * amountShare
                                            percentage = "fixed"
                                        } else if (config?.type === "percentage" && config?.value >= 0) {
                                            distributionAmount = percentagePower * config.value / 100
                                            percentage = config.value
                                        } else {
                                            distributionAmount = percentagePower * defaultPercentage / 100
                                            percentage = defaultPercentage
                                        }
                                        distributeProgramPower(
                                            currentProgramNode, 
                                            childNode, 
                                            distributionAmount, 
                                            percentage,
                                            generation
                                            )
                                    }
                                }
                                break
                            }
                        }
                    }
                }
            }
        }

        function drawPower(node, programPower, percentage) {

            if (node.payload !== undefined) {

                if (node.type === 'Delegation Program') {
                    drawProgram(node)
                    UI.projects.governance.utilities.nodeCalculations.drawPercentage(node, percentage, undefined)
                    return
                }
                if (node.type === 'User Delegate') {
                    drawUserNode(node, programPower, percentage)
                    return
                }
                if (node.type === 'Delegate Power Switch') {
                    node.payload.uiObject.valueAngleOffset = 180
                    node.payload.uiObject.valueAtAngle = true
                    let powerType = 'Delegate Power'

                    const programPowerText = parseFloat(programPower.toFixed(0)).toLocaleString('en') + ' ' + powerType
                    node.payload.uiObject.setValue(programPowerText, UI.projects.governance.globals.designer.SET_VALUE_COUNTER)
                    UI.projects.governance.utilities.nodeCalculations.drawPercentage(node, percentage, 180)
                }
            }

            function drawUserNode(node, programPower, percentage) {
                if (node.payload !== undefined) {

                    const outgoingPowerText = parseFloat(programPower.toFixed(0)).toLocaleString('en')

                    node.payload.uiObject.valueAngleOffset = 180
                    node.payload.uiObject.valueAtAngle = true

                    node.payload.uiObject.setValue(outgoingPowerText + ' Delegate Power', UI.projects.governance.globals.designer.SET_VALUE_COUNTER)

                    UI.projects.governance.utilities.nodeCalculations.drawPercentage(node, percentage, 180)

                    if (node.payload.referenceParent !== undefined) {
                        node.payload.uiObject.statusAngleOffset = 0
                        node.payload.uiObject.statusAtAngle = true

                        node.payload.uiObject.setStatus(outgoingPowerText + ' ' + ' Outgoing Power', UI.projects.governance.globals.designer.SET_STATUS_COUNTER)
                    }
                }
            }

            function drawProgram(node) {
                if (node.payload !== undefined) {

                    const ownPowerText = parseFloat(node.payload.delegationProgram.ownPower.toFixed(0)).toLocaleString('en')

                    node.payload.uiObject.statusAngleOffset = 0
                    node.payload.uiObject.statusAtAngle = false

                    node.payload.uiObject.setStatus(ownPowerText + ' Delegate Power', UI.projects.governance.globals.designer.SET_STATUS_COUNTER)
                }
            }
        }
    }
}