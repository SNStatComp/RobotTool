[![Mentioned in Awesome Official Statistics ](https://awesome.re/mentioned-badge.svg)](http://www.awesomeofficialstatistics.org)

# RobotTool
Tool for detecting (price) changes on webpages by [Statistics Netherlands](https://www.cbs.nl/en-gb).

## Workflow
The RobotTool is an interactive tool for price analysts.

The analyst **defines** a number of **products** and their locations on the web.
During **data collection** the tool checks the products on the websites.
If nothing changed the product status turns green and the last known price for that product is added to the database.
If a change was detected the product status turns red.
The analyst **checks** all **products with status red**:
- If the **price** was **unchanged** the analysts **keeps the price**.
- If the **price** was **changed** the analyst **corrects the price**.
- If the product was not found usually because of a **website change** the analyst **redefines** the **product** configuration.

![Workflow](workflow.png)

The analyst typically repeats this proces on a regular basis, per week or month, for example in the proces to compose the HICP.

## Installation
- Install [node.js](https://nodejs.org/en/) and a modern browser (Mozilla Firefox or Google Chrome)
- Download the RobotTool, unzip it, and in the extracted folder run from the command line: 
```bash
  $ npm install
```
## Start
Run from the command line: 
```bash
  $ npm start
```
A webserver will be started and a browser window will pop up.

## Examples
The folder `Examples` contains an example configuration files that you can load into the tool via the `Edit` -> `Import configuration` button from the products panel.

The example shows the definition of some bikes for which prices are to be collected from [this testsite](https://snstatcomp.github.io/webscrapingtests/RobotTool/).
The prices on this testsite are dynamic: they change once on a while upon new visits. 
When pressing the 'Get new priceinfo' button on the right upper corner the tool will collect prices from the testsite.
You can then manually initialize the price from the 'price' field in the panel that pops up after pressing one of the red boxes.
After retrieving new data using the 'Get new priceinfo' the changes will become visible.
Here is a [screenshot](example1.png) of the tool after the first run.

## Documentation
See the documents in the `/doc` folder for a more extensive description of the functionality and use of the tool. The screenshots in those documents were taken using an earlier version, but the working of the tool is pretty much the same.

## Upgrading
When you upgrade from Robottool version < 4.0.0 you have to upgrade the database.

Run the command:
```bash
  $ npm run-script upgradeDB
```

If you have made some changes in the config file (.\inst\app\config\config.json) apply these changes also to the config file in the new version. Please don’t overwrite the new version of this file with the old version (some new config options were added).

## Limitations / known bugs
- This tool uses a headless version of your browser (usually FireFox). Upon exit of the tool the headless browser process keep running in the background until you explicitly stop it (using the task manager) or restart your computer.

## Suggestions
Questions, suggestions, ideas are welcome: 
- Add an item to the [issue tracker](https://github.com/SNStatComp/RobotTool/issues) issue tracker (you need a GH account).
- Send us a [pull request](https://help.github.com/articles/creating-a-pull-request/) if you have an improvement you think is valuable to all.
- Send an e-mail to `o dot tenbosch at cbs dot nl` or `hjm dot windmeijer at cbs dot nl`.

## License
This tool is provided under an EUPL license on an ‘as is’ basis and without warranties of any kind (see [license file](./LICENSE)).

## Credits
The development of this tool would not have been possible without the active involvement of many price analysts from the price department of Statistics Netherlands.
Early versions of this tool were partly subsidized by a Grant from Eurostat. Older versions are still available at our [research server](http://research.cbs.nl/Projects/RobotTool).
