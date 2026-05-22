import { cp, mkdir, readdir, readFile, stat, writeFile, opendir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ora, { type Ora } from 'ora';

const execAsync = promisify(exec);

const TEMPLATE_DIR = resolve(import.meta.dirname, '..', 'template');

interface CliOptions {
	projectName: string;
	description: string;
	targetDir: string;
}

function printBanner() {
	console.log(`
\x1b[36m  ╔══════════════════════════════════╗
  ║     mefes - Frontend Scaffold     ║
  ║   Vanilla + TS + UnoCSS + Vite    ║
  ╚══════════════════════════════════╝\x1b[0m
`);
}

function printHelp() {
	console.log(`
Usage: npx mefes <project-name> [options]

Options:
  -d, --desc <description>   Project description (default: "")
  -h, --help                 Show help

Example:
  npx mefes my-app
  npx mefes my-app --desc "My awesome app"
`);
}

function parseArgs(argv: string[]): CliOptions {
	const args = argv.slice(2);

	if (args.includes('-h') || args.includes('--help')) {
		printHelp();
		process.exit(0);
	}

	if (args.length === 0) {
		console.error('\x1b[31mError: Please specify the project name.\x1b[0m');
		console.log('  npx mefes <project-name>');
		console.log('  Run \x1b[36mnpx mefes --help\x1b[0m to see all options.');
		process.exit(1);
	}

	const projectName = args[0];

	if (!/^[@a-zA-Z0-9_-]+$/.test(projectName)) {
		console.error(`\x1b[31mError: Invalid project name "${projectName}".\x1b[0m`);
		process.exit(1);
	}

	let description = '';
	const descIndex = args.findIndex((a) => a === '-d' || a === '--desc');
	if (descIndex !== -1 && args[descIndex + 1]) {
		description = args[descIndex + 1];
	}

	const targetDir = resolve(process.cwd(), projectName);

	return { projectName, description, targetDir };
}

async function validateTargetDir(options: CliOptions): Promise<void> {
	try {
		const dir = await opendir(options.targetDir);
		try {
			for await (const _ of dir) {
				console.error(
					`\x1b[31mError: Directory "${options.projectName}" already exists and is not empty.\x1b[0m`
				);
				process.exit(1);
			}
		} finally {
			try {
				await dir.close();
			} catch (closeErr: any) {
				if (closeErr?.code !== 'ERR_DIR_CLOSED') throw closeErr;
			}
		}
	} catch (err: any) {
		// If directory does not exist, ENOENT is expected and okay
		if (err?.code === 'ENOENT') {
			return;
		}
		// Other errors should be propagated
		throw err;
	}
}

async function copyTemplate(targetDir: string): Promise<void> {
	await mkdir(targetDir, { recursive: true });
	await cp(TEMPLATE_DIR, targetDir, { recursive: true, filter: noGitFilter });
}

function noGitFilter(src: string): boolean {
	// Skip .git directories inside template
	const normalized = src.replace(/\\/g, '/');
	return !normalized.endsWith('/.git') && !normalized.includes('/.git/');
}

async function applyTemplate(options: CliOptions): Promise<void> {
	const { projectName, description, targetDir } = options;
	await walkDir(targetDir, async (filePath) => {
		const fileStat = await stat(filePath);
		if (!fileStat.isFile()) return;
		const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
		if (['html', 'json'].includes(ext)) {
			try {
				let content = await readFile(filePath, 'utf-8');
				const original = content;
				content = content.replaceAll('{APP_NAME}', projectName)
					.replaceAll('{DESC}', description);
				if (content !== original) {
					await writeFile(filePath, content);
				}
			} catch {
				// Skip files that cannot be read as text
			}
		}
	});
}

async function walkDir(dir: string, callback: (filePath: string) => Promise<void>): Promise<void> {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			await walkDir(fullPath, callback);
		} else {
			await callback(fullPath);
		}
	}
}

async function initGit(targetDir: string): Promise<void> {
	try {
		await execAsync('git init', { cwd: targetDir });
	} catch {
		// Git is optional, so failures here should not block project creation.
	}
}

async function installDependencies(targetDir: string): Promise<void> {
	const pkgManager = detectPackageManager();
	try {
		await execAsync(`${pkgManager} install`, { cwd: targetDir });
	} catch {
		throw new Error(`Failed to install dependencies with ${pkgManager}. Run ${pkgManager} install manually.`);
	}
}

function detectPackageManager(): string {
	const userAgent = process.env.npm_config_user_agent ?? '';
	if (userAgent.includes('yarn')) return 'yarn';
	if (userAgent.includes('pnpm')) return 'pnpm';
	if (userAgent.includes('bun')) return 'bun';
	return 'npm';
}

function printSuccess(options: CliOptions) {
	const pkgManager = detectPackageManager();
	const runCmd = pkgManager === 'npm' ? 'npm run dev' : `${pkgManager} dev`;

	console.log(`
  \x1b[36mcd ${options.projectName}\x1b[0m
  \x1b[36m${runCmd}\x1b[0m

Happy coding! 🎉
`);
}

export async function main(): Promise<void> {
	printBanner();

	const options = parseArgs(process.argv);
	await validateTargetDir(options);

	const spinner = ora(`Creating a new project in ${options.targetDir}...`).start();

	try {
		spinner.text = 'Copying template files...';
		await copyTemplate(options.targetDir);

		spinner.text = 'Replacing template variables...';
		await applyTemplate(options);

		spinner.text = 'Initializing git repository...';
		await initGit(options.targetDir);

		spinner.text = 'Installing dependencies...';
		await installDependencies(options.targetDir);

		spinner.succeed(`Project "${options.projectName}" created successfully!`);
	} catch (error) {
		spinner.fail('Project creation failed');
		throw error;
	}

	printSuccess(options);
}
