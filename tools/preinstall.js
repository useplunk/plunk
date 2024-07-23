/**
 * Forces use of yarn over npm
 *
 * @description Do NOT allow using `npm` as package manager.
 */
if (!process.env.npm_execpath.includes('yarn')) {
  console.error('You must use Yarn to install dependencies:');
  console.error('$ yarn install\n');
  process.exit(1);
}
