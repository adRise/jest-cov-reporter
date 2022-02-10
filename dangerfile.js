// eslint-disable-next-line no-undef
const { message, danger, warn } = require("danger")

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const changedFiles = [...modifiedFiles, ...createdFiles];

const filePattern = 'coverage'
const codeBlock = 'logExposure'
const whitelistPath = 'src'

let filesChanged = false;
for (let file of changedFiles) {
  if (file.indexOf(filePattern) > -1) {
    filesChanged = true;
    break;
  }
}

if (filesChanged) {
  const promises = changedFiles.map(fileName => danger.git.diffForFile(fileName))
  Promise.all(promises)
    .then((filesChanged) => {
      let isCodeBlockAdded = false;
      filesChanged.forEach((fChange, idx) => {
        if (fChange.added.indexOf(codeBlock) > -1 && changedFiles[idx].indexOf(whitelistPath) > -1) {
          isCodeBlockAdded = true;
        }
      })

      if (!isCodeBlockAdded) {
        warn(`Looks like ${codeBlock} is not added. Please make sure you add it.`)
      } else {
        message(`Good job! Your PR has ${codeBlock}`)
      }
    })
} else {
  message(`Looks like files matching pattern ${filePattern} were not changed`)
}
