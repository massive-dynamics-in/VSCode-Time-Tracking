// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


const filePath = path.join(__dirname, 'time_data.csv'); // Path to your CSV file

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
let startTime = 0;
let totalTimeSpent = 0;
let currentFolderPathObj = {}; // Track the current folder

// Function to format time from milliseconds to HH:mm:ss
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Function to write time to CSV
function writeTimeToCSV(workspaceName, folderPath, data) {
	const fileName = path.basename(folderPath);
	const folderName = path.dirname(folderPath).split(path.sep).pop();
	const entry = `${workspaceName}\t${folderName}\t${fileName}\t${new Date(data.startTime).toLocaleString()}\t${new Date(data.endTime).toLocaleString()}\t${data.timeSpent}\t${path.dirname(folderPath)}\n`;

	if (fs.existsSync(filePath)) {
		fs.appendFileSync(filePath, entry);
    } else {
        const header = 'Workspace\tFolder\tFile\tStart Time\tEnd Time\tTime Spent\tPath\n';
		fs.writeFileSync(filePath, header + entry);
    }
}

function startTimer(workspaceName, folderPath) {
	currentFolderPathObj[folderPath] = {
		workspaceName: workspaceName,
		startTime: Date.now()
	};
}

function stopTimer(folderPath) {
	if (currentFolderPathObj[folderPath]) {
		currentFolderPathObj[folderPath].endTime = Date.now();
		currentFolderPathObj[folderPath].timeSpent = formatTime(currentFolderPathObj[folderPath].endTime - currentFolderPathObj[folderPath].startTime);
		writeTimeToCSV(currentFolderPathObj[folderPath].workspaceName, folderPath, currentFolderPathObj[folderPath]);
		delete currentFolderPathObj[folderPath]; // Remove the folder from tracking
	}
}

function stopAllTimers() {
	// Stop all timers
	for (const folderPath in currentFolderPathObj) {
		if (currentFolderPathObj.hasOwnProperty(folderPath)) {
			stopTimer(folderPath);
		}
	}
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// get workspace name
	const workspaceName = vscode.workspace.name;

	// Get current workspace folder
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders && workspaceFolders.length > 0) {
		for (const workspaceFolder of workspaceFolders) {
			const folderPath = workspaceFolder.uri.fsPath;
			startTimer(workspaceName, folderPath);
		}
	}

	// Start tracking when the document is opened
	vscode.workspace.onDidOpenTextDocument(document => {
		const folderPath = document.uri.fsPath;
		startTimer(workspaceName, folderPath); // Start tracking when a document is opened
	});

	// Stop tracking when the document is closed
	vscode.workspace.onDidCloseTextDocument(document => {
		const folderPath = document.uri.fsPath;
		stopTimer(folderPath); // Stop tracking when a document is closed
	});

	// Get the already open files
	const openEditors = vscode.window.visibleTextEditors;
	if (openEditors.length > 0) {
		openEditors.forEach(editor => {
			const folderPath = editor.document.uri.fsPath;
			startTimer(workspaceName, folderPath); // Start tracking when an editor is opened
		});
	}

	// Handle when the workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
		for (const removedFolder of event.removed) {
			const folderPath = removedFolder.uri.fsPath;
			stopTimer(folderPath); // Stop tracking when a workspace folder is removed
		}
    });

	// Show a status bar item to download the CSV file
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = 'Download Tracked Time';
	statusBarItem.command = 'extension.downloadCSV';
	statusBarItem.show();
	statusBarItem.tooltip = 'Download CSV file';
	context.subscriptions.push(statusBarItem);
	// Command to download the CSV file
	context.subscriptions.push(vscode.commands.registerCommand('extension.downloadCSV', () => {
		
		if (fs.existsSync(filePath)) {
			vscode.window.showSaveDialog({
				defaultUri: vscode.Uri.file(filePath),
				filters: { 'CSV Files': ['csv'] }
			}).then(saveUri => {
				if (saveUri) {
					// Copy the file to the selected location
					fs.copyFileSync(filePath, saveUri.fsPath);
					vscode.window.showInformationMessage('File saved successfully!');
					// delete the CSV file after download
					fs.unlinkSync(filePath, (err) => {
						if (err) {
							console.error("Error deleting file:", err);
						} else {
							console.log("File deleted successfully.");
						}
					});
				} else {
					console.log("User canceled the save dialog.");
				}
			});
		} else {
			vscode.window.showErrorMessage("No tracked time found...");
			console.error("CSV file does not exist at path:", filePath);
		}
	}));


}

// This method is called when your extension is deactivated
function deactivate() {
	// TODO - stop all timers
	stopAllTimers();
}

module.exports = {
	activate,
	deactivate
}
