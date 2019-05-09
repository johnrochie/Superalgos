
function newFloatingObject () {
  const MODULE_NAME = 'Floating Object'
  const ERROR_LOG = true

  const logger = newWebDebugLog()
  logger.fileName = MODULE_NAME

  let thisObject = {
    container: undefined,
    positionLocked: false,
    isOnFocus: false,
    payload: undefined,                     // This is a reference to an object controlled by a Plotter. The plotter can change its internal value and we will see them from here.
    type: undefined,                        // Currently there are two types of Floating Objects: Profile Balls, and Notes.
    underlayingObject: undefined,
    currentSpeed: 0,                        // This is the current speed of the floating object.
    currentMass: 0,                         // This is the current mass of the floating object, including its zoom applied.
    friction: 0,                            // This is a factor that will ultimatelly desacelerate the floating object.
    rawMass: 0,                             // This is the mass value without zoom.
    rawRadius: 0,                           // This is the radius of this floating object without zoom.
    targetRadius: 0,                        // This is the target radius of the floating object with zoom applied. It should be animated until reaching this value.
    physics: physics,
    initializeMass: initializeMass,
    initializeRadius: initializeRadius,
    initializeImageSize: initializeImageSize,
    initializeFontSize: initializeFontSize,
    radomizeCurrentPosition: radomizeCurrentPosition,
    radomizeCurrentSpeed: radomizeCurrentSpeed,
    drawBackground: drawBackground,
    drawMiddleground: drawMiddleground,
    drawForeground: drawForeground,
    drawOnFocus: drawOnFocus,
    updateMass: updateMass,                 // Function to update the mass when the zoom level changed.
    updateRadius: updateRadius,             // Function to update the radius when the zoom level changed.
    getContainer: getContainer,
    finalize: finalize,
    initialize: initialize
  }

  thisObject.container = newContainer()
  thisObject.container.initialize(MODULE_NAME, 'Circle')
  thisObject.container.isClickeable = true
  thisObject.container.isDraggeable = true
  thisObject.container.detectMouseOver = true
  thisObject.container.frame.radius = 0
  thisObject.container.frame.position.x = 0
  thisObject.container.frame.position.y = 0

  let selfMouseOverEventSubscriptionId
  let selfMouseClickEventSubscriptionId
  let spaceMouseOverEventSubscriptionId
  let spaceFocusAquiredEventSubscriptionId

  return thisObject

  function finalize () {
    thisObject.container.eventHandler.stopListening(selfMouseOverEventSubscriptionId)
    thisObject.container.eventHandler.stopListening(selfMouseClickEventSubscriptionId)
    canvas.floatingSpace.container.eventHandler.stopListening(spaceMouseOverEventSubscriptionId)
    canvas.floatingSpace.container.eventHandler.stopListening(spaceFocusAquiredEventSubscriptionId)

    thisObject.container.finalize()
    thisObject.container = undefined
    thisObject.payload = undefined
    thisObject.underlayingObject.finalize()
    thisObject.underlayingObject = undefined
  }

  function initialize (pType, floatingLayer) {
    switch (pType) {

      case 'Profile Ball': {
        thisObject.underlayingObject = newProfileBall()
        thisObject.underlayingObject.initialize()
        break
      }
      case 'Note': {
        thisObject.underlayingObject = newNote()
        thisObject.underlayingObject.initialize()
        break
      }

      case 'Strategy Part': {
        thisObject.underlayingObject = newStrategyPart()
        thisObject.underlayingObject.initialize(floatingLayer, thisObject.payload)
        thisObject.underlayingObject.container.connectToParent(thisObject.container, false, false, true, true, false, false, true, true)
        break
      }
      default: {
        if (ERROR_LOG === true) { logger.write('[ERROR] initialize -> Unsopported type received -> pType = ' + pType) }
        callBackFunction(GLOBAL.DEFAULT_FAIL_RESPONSE)
        break
      }
    }

    thisObject.type = pType

    selfMouseOverEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseOver', onMouseOver)
    selfMouseClickEventSubscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseClick', onMouseClick)

      /* To consider that this object lost the focus, we monitor the space for 2 key events */
    spaceMouseOverEventSubscriptionId = canvas.floatingSpace.container.eventHandler.listenToEvent('onMouseOver', mouseOverFlotingSpace)
    spaceFocusAquiredEventSubscriptionId = canvas.floatingSpace.container.eventHandler.listenToEvent('onFocusAquired', someoneAquiredFocus)

    /* Assign a position and speed */

    thisObject.radomizeCurrentPosition(thisObject.payload.targetPosition)
    thisObject.radomizeCurrentSpeed()
  }

  function getContainer (point) {
    let container

    container = thisObject.underlayingObject.getContainer(point)
    if (container !== undefined) { return container }

    if (thisObject.container.frame.isThisPointHere(point, true) === true) {
      return thisObject.container
    } else {
      return undefined
    }
  }

  function physics () {
    thisObjectPhysics()
    thisObject.underlayingObject.physics()
  }

  function thisObjectPhysics () {
                           // The radius also have a target.

    if (Math.abs(thisObject.container.frame.radius - thisObject.targetRadius) >= 3) {
      if (thisObject.container.frame.radius < thisObject.targetRadius) {
        thisObject.container.frame.radius = thisObject.container.frame.radius + 3
      } else {
        thisObject.container.frame.radius = thisObject.container.frame.radius - 3
      }
      thisObject.container.eventHandler.raiseEvent('Dimmensions Changed', event)
    }

                           // The imageSize also have a target.

    if (Math.abs(thisObject.currentImageSize - thisObject.targetImageSize) >= 1) {
      if (thisObject.currentImageSize < thisObject.targetImageSize) {
        thisObject.currentImageSize = thisObject.currentImageSize + 2
      } else {
        thisObject.currentImageSize = thisObject.currentImageSize - 2
      }
    }

                           // The fontSize also have a target.

    if (Math.abs(thisObject.currentFontSize - thisObject.targetFontSize) >= 0.2) {
      if (thisObject.currentFontSize < thisObject.targetFontSize) {
        thisObject.currentFontSize = thisObject.currentFontSize + 0.2
      } else {
        thisObject.currentFontSize = thisObject.currentFontSize - 0.2
      }
    }

    /* Floating object position in screen coordinates */

    let position = {
      x: 0,
      y: 0
    }

    position = thisObject.container.frame.frameThisPoint(position)

    thisObject.payload.position = position
  }

  function onMouseOver (point) {
    if (thisObject.isOnFocus === false) {
      thisObject.targetRadius = thisObject.rawRadius * 6.0
      thisObject.targetImageSize = thisObject.rawImageSize * 2.0
      thisObject.targetFontSize = thisObject.rawFontSize * 2.0

      thisObject.underlayingObject.container.eventHandler.raiseEvent('onFocus', point)

      thisObject.positionLocked = true

      canvas.floatingSpace.container.eventHandler.raiseEvent('onFocusAquired', thisObject.container)
      thisObject.isOnFocus = true
    }
  }

  function mouseOverFlotingSpace (point) {
    removeFocus()
  }

  function someoneAquiredFocus (container) {
    if (container.id !== thisObject.container.id) {
      removeFocus()
    }
  }

  function removeFocus () {
    if (thisObject.isOnFocus === true) {
      thisObject.targetRadius = thisObject.rawRadius * 1
      thisObject.targetImageSize = thisObject.rawImageSize * 1
      thisObject.targetFontSize = thisObject.rawFontSize * 1

      thisObject.underlayingObject.container.eventHandler.raiseEvent('onNotFocus')

      thisObject.positionLocked = false
      thisObject.isOnFocus = false
    }
  }

  function onMouseClick (pPoint) {
    let event = {
      point: pPoint,
      parent: thisObject
    }
    thisObject.underlayingObject.container.eventHandler.raiseEvent('onMouseClick', event)
  }

  function drawBackground () {
    thisObject.underlayingObject.drawBackground(thisObject)
  }

  function drawMiddleground () {
    thisObject.underlayingObject.drawMiddleground(thisObject)
  }

  function drawForeground () {
    thisObject.underlayingObject.drawForeground(thisObject)
  }

  function drawOnFocus () {
    thisObject.underlayingObject.drawOnFocus(thisObject)
  }

  function initializeMass (suggestedValue) {
    let mass = suggestedValue
    if (mass < 0.1) {
      mass = 0.1
    }

    thisObject.rawMass = mass
    thisObject.currentMass = mass
  }

  function initializeRadius (suggestedValue) {
    let radius = suggestedValue
    if (radius < 2) {
      radius = 2
    }

    thisObject.rawRadius = radius
    thisObject.targetRadius = radius
    thisObject.container.frame.radius = radius / 3

    thisObject.container.eventHandler.raiseEvent('Dimmensions Changed', event)
  }

  function initializeImageSize (suggestedValue) {
    var size = suggestedValue
    if (size < 2) {
      size = 2
    }

    thisObject.rawImageSize = size
    thisObject.targetImageSize = size
    thisObject.currentImageSize = size / 3
  }

  function initializeFontSize (suggestedValue) {
    var size = suggestedValue
    if (size < 3) {
      size = 3
    }

    thisObject.rawFontSize = size
    thisObject.targetFontSize = size
    thisObject.currentFontSize = size / 3
  }

  function radomizeCurrentPosition (arroundPoint) {
    let position = {
      x: Math.floor((Math.random() * (200) - 100)) + arroundPoint.x,
      y: Math.floor((Math.random() * (200) - 100)) + arroundPoint.y
    }

    thisObject.container.frame.position = position
    thisObject.payload.position = {
      x: position.x,
      y: position.y
    }
  }

  function radomizeCurrentSpeed () {
    var initialXDirection
    var randomX = Math.floor((Math.random() * 10) + 1)
    if (randomX > 5) {
      initialXDirection = 1
    } else {
      initialXDirection = -1
    }

    var initialYDirection
    var randomY = Math.floor((Math.random() * 10) + 1)
    if (randomY > 5) {
      initialYDirection = 1
    } else {
      initialYDirection = -1
    }

    var velocity = {
      x: initialXDirection * Math.floor((Math.random() * 300) + 1) / 100,
      y: initialYDirection * Math.floor((Math.random() * 300) + 1) / 100
    }

    thisObject.currentSpeed = velocity
  }

  function updateMass () {

  }

  function updateRadius () {
  }
}
