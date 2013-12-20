/*
File: hyper-ui.js
Description: HyperReload UI functionality.
Author: Mikael Kindborg

License:

Copyright (c) 2013 Mikael Kindborg

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Code below is split into two parts, one for the UI
// and one for ther server. This is to prepare for an
// eventual headless version of HyperReload. Code currently
// contains serveral dependencies, however.

/*** Modules used ***/

var FS = require('fs')
var PATH = require('path')
var OS = require('os')
var GUI = require('nw.gui')

require('../server/prepare-settings.js')
var FILEUTIL = require('../server/fileutil.js')
var SETTINGS = require('../settings/settings.js')

/*** Globals ***/

// Global object that holds globally available functions.
var hyper = {}

// UI-related functions.
hyper.UI = {}

/*** UI setup ***/

;(function()
{
	var mWorkbenchWindow = null
	// UNUSED: var mDocumentationWindow = null
	// UNUSED: var mStoreWindow = null

	function setupUI()
	{
		styleUI()
		setUIActions()
		setWindowActions()
		setUpFileDrop()
	}

	function styleUI()
	{
		// Apply jQuery UI button style.
		//$('button').button()

		// Set layout properties.
		/*
		$('body').layout(
		{
			west: { size: 400 },
			center: { maskContents: true },
			fxName: 'none'
		})
		*/
	}

	function setUIActions()
	{
		var button = null

		// Workbench button action.
		button = $('#button-workbench')
		button && button.click(function()
		{
			if (mWorkbenchWindow && !mWorkbenchWindow.closed)
			{
				// Bring existing window to front.
				mWorkbenchWindow.focus()
			}
			else
			{
				// Create new window.
				/*mWorkbenchWindow = GUI.Window.open('hyper-workbench.html', {
					//position: 'mouse',
					width: 901,
					height: 600,
					focus: true
				})*/
				mWorkbenchWindow = window.open(
					'hyper-workbench.html',
					'workbench',
					'resizable=1,width=800,height=600')
				mWorkbenchWindow.moveTo(50, 50)
				mWorkbenchWindow.focus()
				// Establish contact. Not needed/used.
				mWorkbenchWindow.postMessage({ message: 'hyper.hello' }, '*')
			}
		})

		/*
		// UNUSED
		// Documentation window is opened from hyper-ui.html.
		// Documentation button action.
		button = $('#button-documentation')
		button && button.click(function()
		{
			if (mDocumentationWindow && !mDocumentationWindow.closed)
			{
				// Bring existing window to front.
				mDocumentationWindow.focus()
			}
			else
			{
				// Create new window.
				// Note: The documentation is not part of the
				// HyperReload GitHub repo. This code assumes
				// that ../documentation/index.html exists.
				// TODO: The window parameters do not take effect.
				mDocumentationWindow = window.open(
					'../../documentation/documentation.html',
					'documentation',
					'menubar=1,toolbar=1,location=1,scrollbars=1,resizable=1,width=800,height=600')
				mDocumentationWindow.moveTo(75, 75)
				mDocumentationWindow.focus()
			}
		})

		// UNUSED
		// Store button action.
		button = $('#button-store')
		button && button.click(function()
		{
			if (mStoreWindow && !mStoreWindow.closed)
			{
				// Bring existing window to front.
				mStoreWindow.focus()
			}
			else
			{
				// Create new window.
				mStoreWindow = window.open(
					'../../documentation/hyper-store.html',
					'store',
					'menubar=1,toolbar=1,location=1,scrollbars=1,resizable=1,width=800,height=600')
				mStoreWindow.moveTo(100, 100)
				mStoreWindow.focus()
			}
		})
		*/

		// Reorder of project list by drag and drop.
		$(function()
		{
			$('#project-list').sortable(
			{
				stop: function()
				{
					updateProjectList()
				}
			})
			$('#project-list').disableSelection()
		})

		// Message handler.
		window.addEventListener('message', receiveMessage, false)

		// Display of file monitor counter.
		setInterval(function() {
			hyper.UI.displayNumberOfMonitoredFiles() },
			1500)
	}

	function setWindowActions()
	{
		// Listen to main window's close event
		GUI.Window.get().on('close', function()
		{
			GUI.App.quit()
		})
	}

	function receiveMessage(event)
	{
		//console.log('Main got : ' + event.data.message)
		if ('eval' == event.data.message)
		{
			hyper.SERVER.evalJS(event.data.code)
		}
	}

	function setUpFileDrop()
	{
		var originalDropTaget = null

		// Block change page on drop.
		window.ondragover = function(e) { e.preventDefault(); return false }
		window.ondragend = function(e) { e.preventDefault(); return false }
		window.ondrop = function(e) { e.preventDefault(); return false }

		// Set up drop handling using a drop target overlay area.
		var dropTarget = $('#panel-page')
		dropTarget.on('dragenter', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			$('#drag-overlay').show();
		})
		$('#drag-overlay').on('dragleave dragend', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			$('#drag-overlay').hide();
		})
		$('#drag-overlay').on('drop', function(e)
		{
			e.stopPropagation()
			e.preventDefault()
			$('#drag-overlay').hide();
			handleFileDrop(e.originalEvent.dataTransfer.files)
		})
	}

	function handleFileDrop(files)
	{
		// Debug print.
		/*for (var i = 0; i < files.length; ++i)
		{
			console.log(files[i].path);
		}*/

		if (files.length > 0)
		{
			var path = files[0].path
			if (FILEUTIL.fileIsHTML(path))
			{
				hyper.SERVER.setAppPath(path)
				hyper.addProject(path)
				createProjectEntry(path)
			}
			else
			{
				alert('Only HTML files (extension .html or .htm) can be used')
			}
		}
	}

	function createProjectEntry(path)
	{
		// Template for project items.
		var html =
			'<div class="ui-state-default ui-corner-all">'
				+ '<button '
				+	'type="button" '
				+	'class="button-open btn btn-default" '
				+	'onclick="hyper.openFileFolder(\'__PATH1__\')">'
				+	'Code'
				+ '</button>'
				+ '<button '
				+	'type="button" '
				+	'class="button-run btn btn-success" '
				+	'onclick="hyper.runAppGuard(\'__PATH2__\')">'
				+	'Run'
				+ '</button>'
				+ '<h4>__NAME__</h4>'
				+ '<p>__PATH3__</p>'
				+ '<button '
				+	'type="button" '
				+	'class="close button-delete" '
				+	'onclick="hyper.UI.deleteEntry(this)">'
				+	'&times;'
				+ '</button>'
			+ '</div>'

		// Get name of project, use title tag as first choise.
		var data = FILEUTIL.readFileSync(path)
		if (!data)
		{
			// Return on error, skipping rest of the code.
			console.log('createProjectEntry failed: ' + path)
			return
		}

		var name = getTagContent(data, 'title')
		if (!name)
		{
			name = getNameFromPath(path)
		}

		// Escape any backslashes in the path (needed on Windows).
		var escapedPath = path.replace(/[\\]/g,'\\\\')

		// Replace fields in template.
		html = html.replace('__PATH1__', escapedPath)
		html = html.replace('__PATH2__', escapedPath)
		html = html.replace('__PATH3__', path)
		html = html.replace('__NAME__', name)

		// Create element.
		var element = $(html)
		//console.log(html)

		// Insert element last in list.
		$('#project-list').append(element)
	}

	function getTagContent(data, tag)
	{
		var tagStart = '<' + tag + '>'
		var tagEnd = '</' + tag + '>'
		var pos1 = data.indexOf(tagStart)
		if (-1 === pos1) { return null }
		var pos2 = data.indexOf(tagEnd)
		if (-1 === pos2) { return null }
		return data.substring(pos1 + tagStart.length, pos2)
	}

	// Use last part of path as name.
	// E.g. '/home/apps/HelloWorld/index.html' -> 'HelloWorld/index.html'
	// Use full path as fallback.
	function getNameFromPath(path)
	{
		var pos = path.lastIndexOf(PATH.sep)
		if (-1 === pos) { return path }
		pos = path.lastIndexOf(PATH.sep, pos - 1)
		if (-1 === pos) { return path }
		return path.substring(pos + 1)
	}

	// Project list has been reordered/changed, save new list.
	function updateProjectList()
	{
		var projects = []
		var elements = $('#project-list > div')
		elements.each(function(index, element)
		{
			var path = $(element).find('p').text()
			if (path != '')
			{
				projects.push(path)
			}
		})
		hyper.setProjectList(projects)
	}

	hyper.UI.displayIpAddress = function(ip)
	{
		// document.querySelector('#ip-address').innerHTML = ip
		//document.querySelector('#connect-address-1').innerHTML = ip + ':' + port
		document.querySelector('#connect-address').innerHTML = ip
		// TODO: Does not work. Window.title = 'HyperReload LaunchPad ' + ip
	}

	hyper.UI.setConnectedCounter = function(value)
	{
		document.querySelector('#connect-counter').innerHTML = value
	}

	hyper.UI.displayNumberOfMonitoredFiles = function()
	{
		document.querySelector('#files-counter').innerHTML =
			hyper.SERVER.getNumberOfMonitoredFiles()
	}

	hyper.UI.displayProjectList = function(projectList)
	{
		for (var i = 0; i < projectList.length; ++i)
		{
			var path = projectList[i]
			createProjectEntry(path)
		}
	}

	hyper.UI.setServerMessageFun = function()
	{
		// Set server message callback to forward message to the Workbench.
		hyper.SERVER.setMessageCallbackFun(function(msg)
		{
			// TODO: Send string do JSON.stringify on msg.
			if (mWorkbenchWindow)
			{
				mWorkbenchWindow.postMessage(msg, '*')
			}
		})
	}

	hyper.UI.deleteEntry = function(obj)
	{
		console.log($(obj).parent())
		$(obj).parent().remove()
		updateProjectList()
	}

	setupUI()
})()

/*** Server setup ***/

;(function()
{
	var SERVER = require('../server/hyper-server.js')

	hyper.SERVER = SERVER

	var mProjectListFile = './hyper/settings/project-list.json'
	var mProjectList = []
	var mApplicationBasePath = process.cwd()
	var mRunAppGuardFlag = false
	var mNumberOfConnectedClients = 0
	var mConnectedCounterTimer = 0

	function setupServer()
	{
		// Start server tasks.
		SERVER.startServers()
		SERVER.setTraverseNumDirectoryLevels(
			SETTINGS.NumberOfDirecoryLevelsToTraverse)
		SERVER.fileSystemMonitor()

		// Populate the UI.
		// TODO: Consider moving these calls to a function in hyper.UI.
		readProjectList()
		hyper.UI.displayProjectList(mProjectList)
		hyper.UI.setServerMessageFun()
		displayServerIpAddress()

		SERVER.setClientConnenctedCallbackFun(clientConnectedCallback)
		SERVER.setReloadCallbackFun(reloadCallback)
	}

	function displayServerIpAddress()
	{
		SERVER.getIpAddresses(function(addresses)
		{
			var connectAddress = ''
			var numAddresses = addresses.length
			if (numAddresses == 0)
			{
				connectAddress = '127.0.0.1:' + SETTINGS.WebServerPort
			}
			else
			{
				if (numAddresses > 1)
				{
					connectAddress = 'Try: '
				}
				for (var i = 0; i < numAddresses; ++i)
				{
					connectAddress += addresses[i] + ':' + SETTINGS.WebServerPort
					if (i + 1 < numAddresses)
					{
						connectAddress += ' or '
					}
				}
			}
			hyper.UI.displayIpAddress(connectAddress)
		})
	}

	// The Run button in the UI has been clicked.
	// Clicking too fast can cause muliple windows
	// to open. Guard against this case.
	hyper.runAppGuard = function(path)
	{
		if (!mRunAppGuardFlag)
		{
			mRunAppGuardFlag = true
			hyper.runApp(path)
		}
	}

	// The Run button in the UI has been clicked.
	hyper.runApp = function(path)
	{
		// Prepend base path if this is not an absolute path.
		if (!FILEUTIL.isPathAbsolute(path))
		{
			path = mApplicationBasePath + PATH.sep + path
		}

		console.log('runApp: ' + path)

		SERVER.setAppPath(path)

		if (mNumberOfConnectedClients <= 0)
		{
			// Open a local browser automatially if no clients are connected.
			// This is done so that something will happen when you first try
			// out Hyper by clicking the buttons in the user interface.
			GUI.Shell.openExternal(SERVER.getAppFileURL())

			/* This was used with iframe loading (hyper-client.html)
			GUI.Shell.openExternal(
				SERVER.getServerBaseURL() +
				'#' +
				SERVER.getAppFileName())
			*/
		}
		else
		{
			// Otherwise, load the requested file on connected clients.
			SERVER.runApp()
		}

		mNumberOfConnectedClients = 0

		clearTimeout(mConnectedCounterTimer)
		mConnectedCounterTimer = setTimeout(function() {
			hyper.UI.setConnectedCounter(mNumberOfConnectedClients) },
			5000)
	}

	function clientConnectedCallback()
	{
		mRunAppGuardFlag = false

		++mNumberOfConnectedClients

		clearTimeout(mConnectedCounterTimer)
		mConnectedCounterTimer = setTimeout(function() {
			hyper.UI.setConnectedCounter(mNumberOfConnectedClients) },
			1000)

		// Update ip address in the UI to the actual ip used by the server.

		SERVER.getIpAddress(function(address) {
			hyper.UI.displayIpAddress(address + ':' + SETTINGS.WebServerPort)
		})
	}

	function reloadCallback()
	{
		mNumberOfConnectedClients = 0
	}

	function readProjectList()
	{
		/* Not used:
		// Create project file from template if it does not exist.
		if (!FS.existsSync(mProjectListFile))
		{
			var data = FS.readFileSync(mProjectListTemplateFile, {encoding: 'utf8'})
			FS.writeFileSync(mProjectListFile, data, {encoding: 'utf8'})
		}
		*/

		// Read project file.
		if (FS.existsSync(mProjectListFile))
		{
			var json = FILEUTIL.readFileSync(mProjectListFile)

			// Replace slashes with backslashes on Windows.
			if (process.platform === 'win32')
			{
				json = json.replace(/[\/]/g,'\\\\')
			}

			mProjectList = JSON.parse(json)
		}
	}

	function saveProjectList()
	{
		var json = JSON.stringify(mProjectList)
		FS.writeFileSync(mProjectListFile, json, {encoding: 'utf8'})
	}

	function openFolder(path)
	{
		// Debug logging.
		console.log('Open folder: ' + path)

		GUI.Shell.showItemInFolder(path)
	}

	// TODO: Simplify, use updateProjectList instead.
	hyper.addProject = function(path)
	{
		mProjectList.unshift(path)
		saveProjectList()
	}

	hyper.setProjectList = function(list)
	{
		mProjectList = list
		saveProjectList()
	}

	hyper.openFileFolder = function(path)
	{
		// Prepend base path if this is not an absolute path.
		if (!FILEUTIL.isPathAbsolute(path))
		{
			path = mApplicationBasePath + PATH.sep + path
		}

		// Show the file in the folder.
		openFolder(path)

		// TODO: New method used. This is old code.
		// Drop filename part of path.
		/*var pos = path.lastIndexOf(PATH.sep)
		var folderPath = path.substring(0, pos)
		openFolder(folderPath)*/
	}

	// Display Node.js version info. Not used.
	//document.querySelector('#info').innerHTML = 'node.js ' + process.version

	setupServer()
})()

/* OLD CODE

	// Check: https://github.com/jjrdn/node-open
	function openFolder(folderPath)
	{
		try
		{
			var exec = require('child_process').exec;

			function puts(error, stdout, stderr)
			{
				//console.log('stdout: ' + stdout);
				//console.log('stderr: ' + stderr);
				//console.log('error: ' + error);
			}

			var isLinux = (OS.platform() === "linux")
			var isMac = (OS.platform() === "darwin")
			var isWindows = (OS.platform() === "win32")

			if (isLinux)
			{
				var command = 'nautilus "' + folderPath + '"'
				exec(command, puts)
			}
			else if (isMac)
			{
				var command = 'open "' + folderPath + '"'
				exec(command, puts)
			}
			else if (isWindows)
			{
				var command = 'explorer "' + folderPath + '"'
				exec(command, puts)
			}
			else
			{
				console.log('@@@ openFolder: Unknown platform: ' + OS.platform())
			}
		}
		catch (err)
		{
			console.log("ERROR in openFolder: " + err)
		}
	}


TODO: DELETE

var darwin = vars.globals.localPlatform.indexOf("darwin") >= 0;
var linux = vars.globals.localPlatform.indexOf("linux") >=0;
if (darwin) {
	var command =
		"open "
		+ this.fixPathsUnix(vars.globals.rootWorkspacePath)
		+ vars.globals.fileSeparator
		+ this.fixPathsUnix(projectFolder)
		+ "/LocalFiles"
		;
} else if (linux) {
	var commandStat = fs.statSync("/usr/bin/nautilus");
	if(commandStat.isFile()) {
	  var command =
		  "nautilus "
		  + this.fixPathsUnix(vars.globals.rootWorkspacePath)
		  + vars.globals.fileSeparator
		  + this.fixPathsUnix(projectFolder)
		  + "/LocalFiles &"
		  ;
	} else {
	  var command =
		  "dolphin "
		  + this.fixPathsUnix(vars.globals.rootWorkspacePath)
		  + vars.globals.fileSeparator
		  + this.fixPathsUnix(projectFolder)
		  + "/LocalFiles &"
		  ;
	}
} else {
	var command =
		"explorer \""
		+ vars.globals.rootWorkspacePath
		+ vars.globals.fileSeparator
		+ projectFolder
		+ "\\LocalFiles\"";
}
*/
