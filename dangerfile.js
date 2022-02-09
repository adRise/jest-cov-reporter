import {message, danger} from "danger"

const modifiedMD = danger.git.modified_files.join("- ")
console.log('danger.git.modified_files', danger.git.modified_files)
console.log('danger.git.created_files', danger.git.created_files)
console.log('danger.git.deleted_files', danger.git.deleted_files)

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const deletedFiles = danger.git.deleted_files;
const changedFiles = [...modifiedFiles, ...createdFiles, ...deletedFiles];
const promises = changedFiles.map(fileName => danger.git.diffForFile(fileName))
Promise.all(promises)
  .then((data) => {
    console.log(data)
  })
message("Changed Files in this PR: \n - " + modifiedMD)