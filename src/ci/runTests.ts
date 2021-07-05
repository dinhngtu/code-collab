import * as path from 'path';
import * as cp from 'child_process';

import { runTests, downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath } from 'vscode-test';

async function go() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		const extensionTestsPath = path.resolve(__dirname, './../test');

		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath
		});

	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

go();