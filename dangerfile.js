import { message, danger, warn } from "danger"

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const changedFiles = [...modifiedFiles, ...createdFiles];

console.log('** changedFiles **', changedFiles)

const filePattern = 'coverage'
const codeBlock = 'logExposure'

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
      filesChanged.forEach(fChange => {
        if (fChange.added.indexOf(codeBlock) > -1) {
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
