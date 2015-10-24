/*=============================================================================
 * Orange - Custom Event
 * By Hudell - www.hudell.com
 * OrangeCustomEvents.js
 * Version: 1.1.1
 * Free for commercial and non commercial use.
 *=============================================================================*/
 /*:
 * @plugindesc This plugin Will let you add or copy events to the current map
 *             
 * @author Hudell
 * @help
 * ============================================================================
 * Latest Version
 * ============================================================================
 * 
 * Get the latest version of this script on http://link.hudell.com/custom-events
 * 
 *=============================================================================*/

var Imported = Imported || {};
if (Imported['MVCommons'] === undefined) {
  console.log('Download MVCommons: http://link.hudell.com/mvcommons');
  throw new Error("This library needs MVCommons to work properly!");
}

var OrangeCustomEvents = OrangeCustomEvents || {};

function Game_Custom_Event() {
  this.initialize.apply(this, arguments);
}
Game_Custom_Event.prototype = Object.create(Game_Event.prototype);
Game_Custom_Event.prototype.constructor = Game_Custom_Event;

(function($) {
  "use strict";

  //----------------------------------------------.
  //----------------------------------------------|
  // PROTECTED METHODS                            |
  //----------------------------------------------|
  //----------------------------------------------|

  $.getAnotherMapData = function(mapId, callback) {
    var variableName = '$Map%1'.format(mapId.padZero(3));
    var filename = 'data/Map%1.json'.format(mapId.padZero(3));

    var onLoad = function(xhr, filePath, name) {
      if (xhr.status < 400) {
        window[name] = JSON.parse(xhr.responseText);
        DataManager.onLoad(window[name]);

        callback();
      }
    };

    if (window[variableName] === undefined || window[variableName] === null) {
      MVC.ajaxLoadFileAsync(filename, undefined, onLoad);
    } else {
      callback();
    }
  };


  //----------------------------------------------.
  //----------------------------------------------|
  // PUBLIC METHODS                               |
  //----------------------------------------------|
  //----------------------------------------------|

  //----------------------------------------------
  // Game_Custom_Event
  //----------------------------------------------
  Game_Custom_Event.prototype.initialize = function(mapId, eventId, eventData) {
    this._eventData = eventData;
    Game_Event.prototype.initialize.call(this, mapId, eventId);
  };

  Game_Custom_Event.prototype.event = function() {
    return this._eventData;
  };

  Game_Custom_Event.prototype.revive = function(data) {
    return new Game_Custom_Event(data.mapId, data.id, data.eventData);
  };

  //----------------------------------------------
  // Game_System
  //----------------------------------------------
  Game_System.prototype.clearSelfSwitches = function(mapId, eventId) {
    var switches = ["A", "B", "C", "D"];

    switches.forEach(function(switchId) {
      var key = [mapId, eventId, switchId];
      $gameSelfSwitches.setValue(key, false);
    });
  };

  Game_System.prototype.initCustomEvents = function(mapId) {
    if (this._customEvents === undefined) this._customEvents = {};
    if (this._customEvents[mapId] === undefined) this._customEvents[mapId] = {};
  };

  Game_System.prototype.addCustomEvent = function(mapId, event) {
    this.initCustomEvents(mapId);
    this.clearSelfSwitches(mapId, event.id);
    this._customEvents[mapId][event.id] = event;
  };

  Game_System.prototype.removeCustomEvent = function(mapId, eventId) {
    this.initCustomEvents(mapId);
    this.clearSelfSwitches(mapId, eventId);
    if (this._customEvents[mapId][eventId] !== undefined) this._customEvents[mapId][eventId] = undefined;
  };

  Game_System.prototype.clearCustomEvents = function(mapId) {
    this.initCustomEvents();
    this._customEvents[mapId] = {};
  };

  Game_System.prototype.getCustomEvents = function(mapId) {
    this.initCustomEvents();
    return this._customEvents[mapId];
  };

  //----------------------------------------------
  // Game_Map
  //----------------------------------------------
  Game_Map.prototype.getIndexForNewEvent = function() {
    var index = this._events.length;

    if (index < 1000) {
      index += 1000;
    }

    return index;
  };

  Game_Map.prototype.addEvent = function(eventData, temporary) {
    if (temporary === undefined) {
      temporary = false;
    }

    var index = this.getIndexForNewEvent();

    eventData.id = index;
    var gameEvent = new Game_Custom_Event(this._mapId, index, eventData);
    $gameSystem.clearSelfSwitches(this._mapId, index);

    this._events[index] = gameEvent;

    if (SceneManager._scene instanceof Scene_Map) {
      var sprite = new Sprite_Character(gameEvent);
      SceneManager._scene._spriteset._characterSprites.push(sprite);
      SceneManager._scene._spriteset._tilemap.addChild(sprite);
    }

    if (temporary === false) {
      $gameSystem.addCustomEvent(this._mapId, eventData);
    }

    return gameEvent;
  };

  var oldGameMap_setupEvents = Game_Map.prototype.setupEvents;
  Game_Map.prototype.setupEvents = function() {
    oldGameMap_setupEvents.call(this);

    var customEvents = $gameSystem.getCustomEvents(this._mapId);
    for (var eventId in customEvents) {
      this._events[eventId] = new Game_Custom_Event(this._mapId, eventId, customEvents[eventId]);
    }
  };

  Game_Map.prototype.addEventAt = function(eventData, x, y, temporary) {
    eventData.x = x;
    eventData.y = y;
    this.addEvent(eventData, temporary);
  };

  Game_Map.prototype.spawnEvent = function(eventData, tileList, temporary) {
    for (var i = 0; i < tileList.length; i++) {
      eventData.x = tileList[i].x;
      eventData.y = tileList[i].y;
      this.addEvent(eventData, temporary);      
    }
  };

  Game_Map.prototype.getEventData = function(eventIdOrigin) {
    var event = $dataMap.events[eventIdOrigin];
    if (event === undefined) return undefined;

    return JsonEx.makeDeepCopy(event);
  };

  Game_Map.prototype.getEventDataFrom = function(mapIdOrigin, eventIdOrigin, callback) {
    $.getAnotherMapData(mapIdOrigin, function() {
      var variableName = '$Map%1'.format(mapIdOrigin.padZero(3));

      if (window[variableName] === undefined || window[variableName] === null) return;

      var event = window[variableName].events[eventIdOrigin];
      if (event === undefined) return;

      var eventData = JsonEx.makeDeepCopy(event);
      callback.call(this, eventData);
    });    
  };

  Game_Map.prototype.copyEvent = function(eventIdOrigin, x, y, temporary) {
    var eventData = this.getEventData(eventIdOrigin);
    if (eventData) {
      $gameMap.addEventAt(eventData, x, y, temporary);
    }
  };

  Game_Map.prototype.getRegionTileList = function(regionId) {
    var tileList = [];

    for (var x = 0; x < $gameMap.width(); x++) {
      for (var y = 0; y < $gameMap.height(); y++) {
        if ($gameMap.eventsXy(x, y).length === 0) {
          if ($gameMap.regionId(x, y) == regionId) {
            tileList.push({x : x, y : y});
          }
        }
      }
    }

    return tileList;
  };

  Game_Map.prototype.getRandomRegionTile = function(regionId) {
    var tileList = this.getRegionTileList(regionId);

    if (tileList.length > 0) {
      var index = Math.randomInt(tileList.length);
      return tileList[index];
    }

    return undefined;
  };

  Game_Map.prototype.copyEventToRegion = function(eventIdOrigin, regionId, temporary) {
    var tile = this.getRandomRegionTile(regionId);
    if (tile !== undefined) {
      this.copyEvent(eventIdOrigin, tile.x, tile.y, temporary);
    }
  };

  Game_Map.prototype.copyEventFrom = function(mapIdOrigin, eventIdOrigin, x, y, temporary) {
    this.getEventDataFrom(mapIdOrigin, eventIdOrigin, function(eventData) {
      $gameMap.addEventAt(eventData, x, y, temporary);
    });
  };

  Game_Map.prototype.copyEventFromMapToRegion = function(mapIdOrigin, eventIdOrigin, regionId, temporary) {
    var tile = this.getRandomRegionTile(regionId);
    if (tile !== undefined) {
      this.copyEventFrom(mapIdOrigin, eventIdOrigin, tile.x, tile.y, temporary);
    }    
  };

  Game_Map.prototype.spawnMapEvent = function(eventIdOrigin, regionId, temporary) {
    var eventData = this.getEventData(eventIdOrigin);
    var tileList = this.getRegionTileList(regionId);

    if (eventData && tileList) {
      this.spawnEvent(eventData, tileList, temporary);
    }
  };

  Game_Map.prototype.spawnMapEventFrom = function(mapIdOrigin, eventIdOrigin, regionId, temporary) {
    var tileList = this.getRegionTileList(regionId);

    if (tileList.length > 0) {
      this.getEventDataFrom(mapIdOrigin, eventIdOrigin, function(eventData) {
        $gameMap.spawnEvent(eventData, tileList, temporary);
      });
    }
  };

  // Compatibility patch:
  if (MVCommons.ajaxLoadFileAsync === undefined) {
    MVCommons.ajaxLoadFileAsync = MVCommons.loadFileAsync;
  }
})(OrangeCustomEvents);

PluginManager.register("OrangeCustomEvents", "1.1.1", "This plugin Will let you add or copy events to the current map", {
  email: "plugins@hudell.com",
  name: "Hudell",
  website: "http://www.hudell.com"
}, "2015-10-22");
