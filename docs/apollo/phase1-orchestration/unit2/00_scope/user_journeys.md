# Apollo Phase 1-NN Unit 2 User Journeys

## Journey 1: Reach Apollo from the normal workspace

1. Launch Electron in Apollo mode.
2. Open the standard `/pro` workspace.
3. Click the visible `Apollo` entry.
4. Confirm `/pro/apollo` renders the Unit 2 shell.

## Journey 2: Build a non-numeric topology draft

1. Add a material reference shell.
2. Add nodes.
3. Add a member using node/material references.
4. Add a support using non-numeric DOF states.
5. Confirm the topology summary and viewer update.

## Journey 3: Save and reload

1. Save the draft through the Electron bridge.
2. Change project metadata without saving.
3. Reload the saved file.
4. Confirm the saved values return and the unsaved overwrite disappears.

## Journey 4: Trigger blocked actions

1. Attempt numeric execution.
2. Confirm explicit rejection.
3. Attempt result publication.
4. Confirm explicit rejection.
