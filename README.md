# Daylist

A simple To-Do List application for HNG Internship 15 Stage 1. Built with HTML, CSS, and JavaScript, with no installation or build step required.

## Open the app

1. Open this project folder in File Explorer.
2. Double-click `index.html` to open it in your browser.
3. Enter a task name, optionally add notes, choose a priority, and click **Add task**.

## Things to try

- Add a task called “Finish my HNG assignment” with a note and High priority.
- Click **Edit**, change the note or name, then click **Save changes**.
- Select the checkbox beside a task to mark it completed. Select it again to make it active.
- Switch between **All tasks**, **Active**, and **Completed**.
- Refresh the page: saved tasks should still appear.
- Click **Delete** and confirm to remove a task.
- Make the browser window narrow to see the phone layout.

## The three app files

- `index.html`: the page and its form.
- `style.css`: colors, spacing, and layouts for computers and phones.
- `script.js`: creating, viewing, editing, deleting, and completing tasks; notes; priorities; and saving.

Tasks save in this browser on this device using local storage. They do not sync between devices or browsers. Clearing browser data can remove them, and private browsing may discard them when closed. Moving the app to a different address does not transfer saved tasks. An optional online font is used when available; otherwise the app uses a system font.

No GitHub setup or deployment is included yet.

## Review results

All eight requested features were checked with automated tests in Microsoft Edge. All 21 checks passed, including task actions, editing notes and priorities, cancellation, blank-name validation, saving after refresh, and layouts from 320 to 1440 pixels wide. Task actions were also exercised at phone width. These are browser simulations, not tests on a physical phone.

The review fixed an issue where a rejected whitespace-only task name could prevent a later notes-only edit from saving. Starting or cancelling an edit now clears the old validation error.

`review.test.cjs` contains the optional browser checks; `.review-tools` holds their tooling and screenshots. Neither is needed to open or use the app. To rerun the checks on this computer, use `node review.test.cjs` with Node.js and Microsoft Edge installed. If the testing tools are missing, install them with `npm.cmd install --prefix .review-tools --no-audit --no-fund --package-lock=false playwright` first. Tests use a separate browser session and do not change your personal task list.
