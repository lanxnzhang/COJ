# TODO

## Build script editor

An essential purpose for this repository is to facilitate editing of data, with the help of scripts. It is inconvenient for users to revise scripts, download the results, read them in txt, and edit data in different softwares.
Create a simple GUI which allows the user to run scripts, see the running results, and edit the data.

### Features

- For right now:
  1. User can import scripts, make settings, and run them.
  2. User can see the running results, in particular the processed text lines and processed dictionary entries. Show processed text lines and dictionary entries in two areas/pages. For processed text lines, the results should show their file, position, syntax tree path, categories (new or existing) and so on, like the output information in reports. For processed dictionary entries, the results should show the lemma ID and revised contents.

-Next Step:
  1. Differentiate the text lines having single or multiple search/processed results.
  2. User can use dictionary.
  3. User can see the context of processed text lines.
  4. User can render syntax trees.
  5. User can modify the result.

### After commit d77c4ce

Currently, there are still issues with .py scripts. Do not make any change to the current scripts. Copy them(compound_lemma_processor, lemmas_processor, mk_lemma_processor) under the folder scripteditor, then only revise the new copied scripts. Rename the copied scripts as compound_lemma_forgui, lemma_forgui, mk_lemma_forgui. When show the choice of scripts in the GUI, do not show the '_' and 'forgui'. For example, in drop-down menu, their name should be shown as 'compound lemma','lemma','mk lemma'.

#### Refine the lemmas_forgui.py to a version suitable for the GUI
1. First, check if the script works properly. Make sure its function is: 
  Based on the xml data (not the txt); 
  Searched items should be leaves without 'lemma' tag. For example,  <N index="1" phon="LOG" form="papuri" /> should be detected and automatically assigned a lemma ID. <P-COMP lemma="L000530" phon="PHON" form="to" /> should be kept since it has a 'lemma' tag;
  When a form is in the dictionary, the lemma should equal to its lemma in the dictionary;
  When a form is not in the dictionary, a new unique lemma ID should be generated, and the user can choose to automatically add the new form in the dictionary;
  The object searched by AUTO_POS_QUERY is the content in leaves. For example, it is N in <N index="1" phon="LOG" form="papuri" />. 
2. In GUI, for the left part about settings:
  put the settings about True/False at the top, then the settings requiring user to type something;
  Put the checkbox at the right of the setting, not below it;
  Add discriptions of settings. When users put their mouse on an icon like ⍰, they will be able to see the discriptions of this setting. The discriptions disappear when user move away their mouse.
3. For realisation of functions in GUI:
  Move all lemma id settings to advanced settings (LEMMA_PREFIX  = "N"    # prefix for newly generated IDs  (L, N, F, T, …)LEMMA_DIGITS  = 6      # zero-padded width  (6 → N000001)LEMMA_START   = 1      # minimum numeric value for new IDs DICT_ID_PREFIX = "T"   # prefix applied when inserting an existing dict ID);
  The default lemma prefix is L, digits=6, start=1;
  Differentiate existing lemma been added and newly generated lemma in the output result, such as mark them or put them in different categories. Same as for dictionary entries - differenciate the existing and newly created;
  NORMALIZE_DICT is not needed. Do not run it in this script. But it may be added back in the future at another place or in another script.
4. For the realisation of ADVANCED_DISAMBIG in GUI: 
  Move it to the advanced settings. The default status is true.
  Mark the result with multiple candidates in the result.

### After commit 1c41a33

Create a new folder named scripts under scripteditor, and move the py scripts into this new folder.
Since the output results of processed lines are too many, user needs some methods to manage them. Add a filter to sort through different types of results. Advanced filter would allow user to limit the scope of files processed by the script, as well as the scope and quantity of the displayed results. 

### After commit 9b52355
The processing files should also include files in COJ/data/xml/trees, such as BS.xml. Add them in processing scope. Categorise them, since there are lots of files and it would be inconvenient for the users to browse and choose. 
For lemma_forgui.py:
  1. The disambig logic in lemma_forgui.py is wrong. The content in leaf should be matched with the pos part in the dictionary. For example, nwo has two candidates L000520, L051650. Since the leaf <N phon="LOG" form="nwo" /> is N, the first choice should be <entry id="L051650"> with <pos> <value>noun</value> but not  <entry id="L000520"> <value>case particle</value>. N means noun - there should be a mapping table for POS (part of speech) abbreviations in this repository. Candidates should be ranked from highest to lowest score. But the scores do not need to be shown in GUI at the current stage.
  2. LEMMA PREFIX, LEMMA DIGITS, LEMMA START, DICT ID PREFIX - these functions are currently unused. Remove them without affecting any other functionality.
In filter, add the function to customise displayed result scope in advanced filters. For example, showing 100-200 of 380 matching changes. This function should not go against with 'Maximum displayed'. Consider refine them and make it more convenient for user to browse the result.

### After commit 9b7f7a9
Now we need to add a dictionary in the GUI. The dictionary should be able to open and hide. Basically, the user can search for form or lemma id in the dictionary. When they do so, the result should display a complete dictionary entry, in a reader-friendly format (I mean not in the raw xml data format). Also add advanced search function, which currently allows user to customise the type of data they search in the dictionary(gloss, note...), and should be compatible with more complex future functions.
The user can click the lemma id in the candidates to directly open that entry format. It should facilitate the review and search.

### After commit 389b645
Results automatically generated by the script may be inaccurate and require manual verification. Therefore, we need to add a manual review function for the output.
This function includes the following:
  1. Confirm. User thinks this item of output is problem-free. User can check the box or mark a button to confirm. Only confirmed results will be written to the final output file. A "select all" function is required, supporting selection by category. The interface needs to be clean and intuitive.
  In addition, add an optional feature allowing users to choose whether to hide confirmed result items from the results list.
  2. Choose. For results with multiple candidates, if the user finds that the highest-scoring result is not a match, they can select and switch to one of the other candidates.
  3. Add. If the user determines that there is no matching result among the candidates, they need to add a new dictionary entry. In this case, the program automatically assigns a unique new dictionary ID to the resulting form and generates the content for the "form" and "kana" tags in this dictionary entry, along with empty tags for standard dictionary entries (such as pos). User can revise, add, or delete tags.
  User can manually modify the ID number, but the system must display a warning if the numeric portion conflicts with an existing dictionary ID. 
  User can also edit the entry's content and click "Save" to add this new entry to the dictionary; however, manual confirmation is still required to commit the entries to the final output. Dictionary entries added via this method are selected by default within the dictionary output categories, though users can deselect them.

### After commit 51f138e
Currently the COJ/data is not the updatest ones. After studying scripts/data_conversion, please:
  1. Read D:\Lanxin\Desktop\data.
  2. Use these new data to substitute the old data in data/txt. (Do not change the data in D:\Lanxin\Desktop\data). Keep the original folder stucture in COJ, just substitute the files.
  3. Convert the new data to xml. Make sure they can round trip.

### After commit a188e2f
For scripteditor app:
The single candidate output do not have the option to add new entry (Multiple candidates output has). But The user need this function. Add it and improve the GUI.

### After commit a188e2f (2)
For scripteditor app:
The user need to see the context of a word. Please add a function, when the user click a word, it will be shown in the whole passage and highlighted to facilitate the read and search. The whole passage only need to have the transcriptions and kanji texts. The context should be shown at the right part of this app - do not mess up the editing area.

### After commit 354bfd9
The xml data need to be revised.
For a block, for example:
 <block id="1_EN_01" header="ugonapar eru kamu nusi papuri ra moromoro kikosi myese to noru">
    <comment raw="IP-MAT,IP-ARG,0@侍,*" />
    <comment raw="IP-MAT,IP-ARG,1@神主祝部等諸聞食登,*" />
    <comment raw="IP-MAT,2@宣,*" />
    <IP-MAT>
      <IP-ARG>
        <IP-REL>
          <VB>
            <VB-STM phon="LOG" form="ugonapar" />
            <VAX-STV-ADN phon="LOG" form="eru" />
          </VB>
        </IP-REL>
        <C-NP index="1" inferred_index="1">
          <N>
            <N phon="LOG" form="kamu" index="1" inferred_index="1" />
            <N index="2" phon="LOG" form="nusi" />
          </N>
        </C-NP>
        <C-NP index="5">
          <N>
            <N phon="LOG" form="papuri" index="1" inferred_index="1" />
            <N index="2" phon="LOG" form="ra" />
          </N>
        </C-NP>
        <NP>
          <N phon="LOG" form="moromoro" />
        </NP>
        <VB>
          <VB-STM phon="LOG" form="kikosi" />
          <VB-IMP phon="LOG" form="myese" />
        </VB>
        <P-COMP lemma="L000530" phon="PHON" form="to" />
      </IP-ARG>
      <VB-ADC phon="LOG" form="noru" />
    </IP-MAT>
  </block>

The part below is only kept for round trips to txt:
    <comment raw="IP-MAT,IP-ARG,0@侍,*" />
    <comment raw="IP-MAT,IP-ARG,1@神主祝部等諸聞食登,*" />
    <comment raw="IP-MAT,2@宣,*" />

However, the kanji text (raw text) should be encoded in every block as below logic:
  1. Let see the txt file at first:
    =N(" ugonapar eru kamu nusi papuri ra moromoro kikosi myese to noru ")
    IP-MAT,IP-ARG,0@侍,*
    IP-MAT,IP-ARG,IP-REL,VB,VB-STM,LOG,ugonapar
    IP-MAT,IP-ARG,IP-REL,VB,VAX-STV-ADN,LOG,eru
    IP-MAT,IP-ARG,1@神主祝部等諸聞食登,*
    IP-MAT,IP-ARG,C-NP,N,N,LOG,kamu
    IP-MAT,IP-ARG,C-NP,N,N;@2,LOG,nusi
    IP-MAT,IP-ARG,C-NP;@5,N,N,LOG,papuri
    IP-MAT,IP-ARG,C-NP;@5,N,N;@2,LOG,ra
    IP-MAT,IP-ARG,NP,N,LOG,moromoro
    IP-MAT,IP-ARG,VB,VB-STM,LOG,kikosi
    IP-MAT,IP-ARG,VB,VB-IMP,LOG,myese
    IP-MAT,IP-ARG,P-COMP,L000530,PHON,to
    IP-MAT,2@宣,*
    IP-MAT,VB-ADC,LOG,noru
    ID,1_EN_01
  2. The explaination for the kanji in the txt file:
  0@侍: 0@ means it is the first sentence (line) in this block (poem). 1@ means it is the second. Use numbers starting from 1 (not 0 as in txt) when encoding xml to avoid ambiguity.
  The part below 0@侍 before 1@神主祝部等諸聞食登 is the transcription for it. Ignore tags before 0@侍 and 1@神主祝部等諸聞食登 - they are meaningless and do not contribute to the syntax tree's hierarchy.
  3. As a result, the kanji should be encoded with it transcriptions as the raw text for this block as the logic:
    sentence 1
      kanji: 侍
      transcription: ugonapar eru
    sentence 2
      kanji: 神主祝部等諸聞食登
      transcription: kamu nusi papuri ra moromoro kikosi myese to
    sentence 3
      kanji: 宣
      transcription: noru
  4. ID,1_EN_01 should be encoded as EN.1.1 in xml (like MYS.1.1, because it is best to keep the ID format consistent.). 1_EN_01 can be kept somewhere if round trips need.

Make sure you clearly mark and distinguish data only used for round trips with txt and data used for processing and encoding xml data.

### After commit 9594b53
Optimise the script editor.
1. processing scope.
  Layer it. Such as 'Texts under editing - EN - EN 01 - EN 1.1''Uploaded trees - BS - BS.1'.
  Optimize the UI design for selection. Avoid using separate "Select All" and "Clear" buttons. Instead, place a selection checkbox before each level; clicking it selects that item or the entire level, while clicking again deselects it. When a level is only partially selected, display a visual state that differs from the "fully selected" state.
2. Keep global settings—such as the processed lines and the filters used for selection—fixed at the top of the page. As the user scrolls, only the processed results at the bottom should move.
3. 'EN_01.xml · utterance EN.1.1 · line 3' should be 'EN_01.xml · EN.1.1 · line 3', which means do not use the word 'utterance'.
4. The part 'Before/After' (such as Before / after
IP-MAT,IP-ARG,C-NP,N,N,LOG,kamu
IP-MAT,IP-ARG,C-NP,N,N,L051191,LOG,kamu) is useless. Delete it.
5. The "lemma ID" in the top-right corner of the search results is inconvenient to view and does not update in real-time when changes are made (as shown in the red box in the image D:\Lanxin\Pictures\Screenshots\2026-07-24 230418). Remove this lemma ID.
6. 'Add New Entry' should be a global setting. Do not put it in every single output. When user adds one new dict entry, they should be able to selete it in every choosing lemma settings. If the user deletes it later, the selection will be invalid, and the user must choose a valid value instead. If the user does not confirm this dictionary entry when generating the final output, the selection of that entry will be disregarded—meaning that no instances of that selection will be included in the final output. In either case, a warning must be displayed to the user, or an issue/problem must be indicated.
It should be noted that in this case, the chosen lemma must be also displayed in the results for single candidate, even if there is initially only one option.
7. Do not put the checkbox 'Confirm' together with Selected and Chosen lemma. It looks a bit messy the way it is now.
8. The "Manual review" function overlaps with the filter above it. Please merge them; do not name this merged filter "Manual review" - just remove that text. Furthermore, this filter is not applicable to the "Dictionary entries" and "Output files" sections; do not display this filter—which applies only to "Text lines"—when the user switches to those sections, to avoid confusion.
Consider split this filter with the functions 'Create final output' and 'Add new entry'. Do not mess them together to avoid confusion.
9. Do not use separate "Confirm selected category" and "Clear confirmations" buttons. Such a design is bloated, counterintuitive, and not aesthetically pleasing. Place a selection checkbox above the list of results that remains fixed at the top of the page as the user scrolls. Clicking it selects all results on the current page, while clicking it again deselects them.

### After commit 51f0268
1. When users scroll the page using the scrollbar on the far right of the page, they find nothing below. Fix this bug. (Shown in D:\Lanxin\Pictures\Screenshots\001545 and D:\Lanxin\Pictures\Screenshots\001521). In full-screen, the smaller scrollbar used to scroll through results are positioned very far away from the results themselves. Please arrange them closer together in an aesthetically pleasing layout.
2. Move the setting 'Hide confirmed'. Put it together with 'Select current page'.
3. The checkbox for each result should not have a double-layered border; it looks not pleasing (as shown in the red box in the image D:\Lanxin\Pictures\Screenshots\002116). Only keep one border for the checkbox.
4. Add new entry:
  4.1 Match the form: for a new dict entry added by the user, it should only be listed in the results which have the same form. For example, when the user adds a new dict entry having a .form kamu, it should only be listed under the chosen lemma list of kamu but not other words. Also add it in candidates list of kamu.
  4.2 Advanced setting: when automatically generate an unused new lemma id, the user can manually input a number for the beginning of generating. Add a button in advanced setting, when click it, automatically generate the content of .KANA based on the content of .FORM.
  4.3 tag choose: Add a small button (like triangle) next to each tag (like .FORM), and when the user clicks it, a dropdown menu will appear where user can choose an existing tag already in the dictionary or enter a new tag manually in the input box.
  5. Dictionary entries editing
  5.1 Full revised entry not needed, such as: 
    Full revised entry
    ---------------------------------------------------
    === L000001
    .GLOSS	
    .FORM	ugonapar
    .KANA	ウゴナハ⟨r⟩
    .POS
  Delete this part.
  5.2 distinguish machine added and manually added in the list. Add a tag 'USER' for the manually added entry. Also add a filter like the one in 'Text lines' for 'Dictionary entries', include the function of choosing types. Like the design in text lines, move the checkbox to the top left, add a check box for select all, put the setting 'Hide confirmed' together with 'Select current page'.
  5.3 Every dict entry in the result list should be able to be edit and delete, not just the manually added ones.
  5.4 Bug: when machine added and manually added lemma id overlap, the GUI will not warn the user. Instead, the same ID will overwrite the existing one. Fix this bug.
6. Dictionary search
  UI design: The title of the dictionary interface should not be named as 'COJ DICTIONARY Dictionary reader'. Just use 'Dictionary' as the title.

### After commit feaf983
1. Under 'Dictionary entries':
  There is a checkbox named 'Include in final output' in each entry. Delete the words 'Include in final output' and move the checkbox to the top left of each dict entry, to make the user interface cleaner and more visually appealing.
2. In Processing scope, when choose EN.1.1 under EN 01, nothing happened. Refine it - allow user to select individual passages for processing, such as selecting EN.1.1, EN.1.3, and SM.1.1. Display the total number of documents and passages selected by the user.
3. In Processing scope, when user clicks on a specific document—such as "EN 01"—it (and its upper categories, such as EN and Texts under editing, to show the hierarchy) should remain temporarily pinned at the top of the view without jumping elsewhere. It should stay pinned until the user collapses "EN 01," swipes up at the "EN 01" position, or continues to scroll down after reaching the final passage of "EN 01."

#### Revise Further
1. You misunderstand my requirement. Do not add Texts underediting EN in the title of EN 01 (and others). Delete them. What I mean is pin EN 01, EN, and Texts under editing on the top when user scrolls the passages under EN 01. Refer to the design of vs code's outline. 
2. 'Console output' is not needed. Delete it.

### TBD (editing...)
(TBD?)
Combine editor and scripteditor as a whole

1. I choose EN1.1, EN.1.3, EN.1.4 and click run processor. Nothing happened. It still only allows the user to choose a whole document otherwise it won't run. Fix it.
2. Compound lemma:
  Rename it as compound.
  revise the logic
3. Mk lemma:
  rename it as replace
  revise the logic
4. Add new entry:

## Build tree editor
Copy the folder "editor" and rename the copied folder as "treditor". Make changes within this copied folder; do not affect the original "editor" folder.
1. Optimize and revise the GUI design to make it more visually appealing and consistent with the scripteditor's style. Use blue (#6F8EC9) as the theme color.
2. Update the data it uses to keep it consistent with the current repository.

### After commit b0ad5c4
1. Users can collapse the expanded file directory on the left, thereby providing more space for the browsing view on the right.
2. For each word displayed in the syntax tree and the text, use italics to represent words with tag 'PHON' or other tag including 'PHON' (such as PHON-KUN), use underlining to represent words with tag 'NLOG', use plain to represent words with tag 'LOG' and others.
3. The functions to show 'Node metadata' and 'Round-trip comments' is not needed. Delete them.
4. User can collapse or expand the 'Passage text' part to have more room to view the syntax tree. Rename 'Passage text' as 'Text'. Moreover, user can choose to switch to a two-column view, displaying the kanji text for each line to the left of the transcription.
5. In the syntax tree, user can select whether to display the Kanji characters corresponding to the transcription of each sentence, placing the characters below the transcription. 
6. User can choose whether to display lemma ids under leaf's tags. For example, L000035 is under mi, the user can choose to display it under PFX-HON (mi's tag).
7. Users can click to expand or collapse nodes. When a node is collapsed, the corresponding word forms below are written together without spaces between them.

### After commit 7247ae5
1. User can search a poem like MYS.1.1 to show its syntax tree.
2. The document is currently displayed in two columns. This is too redundant and takes up too much space; please change it to a single column.
3. Users can scale the syntactic tree and switch to full-screen mode. The horizontal spacing between words can be adjusted to prevent the tree from becoming excessively wide after collapsing certain nodes.
4. Added a feature to expand all collapsed nodes with a single click.
5. Optimize the kanji character layout. Add some spacing around them; the current display looks uncomfortable.
6. Clicking on a word form within the syntax tree also allows user to navigate to the corresponding dictionary entry.
7. Add a function that allows users to edit the syntax tree without conflicting with the current display interface. At least, Users can directly modify the content of a node, and add or delete a child node or a sibling node for any given node.
8. Provide two options for the display position of the lemma ID: one is to display it below the word form (as in previous versions), and the other is to display it below the tag (as in the current version).

#### Revise Further
1. The single column view mode is NOT for the text. Please restore it to its original state: user can choose to switch to a two-column view, displaying the kanji text for each line to the left of the transcription.
2. Change the document selection area to a sidebar layout (View D:\Lanxin\Pictures\Screenshots\142232). Do not let the passage selection pop out as a new column; the left sidebar should consist of only one column. Moreover, Refine its hierarchical structure. For example, after expanding "texts under editing," the user can expand or collapse the category "EN," then expand or collapse the category "EN01," and finally select "EN.1.1."
3. Additionally, when user clicks on a document within the "Uploaded trees" category, that category automatically collapses and the view jumps back to "Texts under editing" (expanding it if it wasn't already open); this behavior makes for a very unpleasant user experience. Instead, when a user clicks on a specific document—such as "MYS 01"—it should remain temporarily pinned at the top of the view without jumping elsewhere. It should stay pinned until the user collapses "MYS 01," swipes up at the "MYS 01" position, or continues to scroll down after reaching the final passage of "MYS 01."
4. The "open a poem directly" function should be integrated into the "filter documents" search box, and the separate "open a poem directly" search box should be removed to simplify the interface and workflow. The system operates as follows: if a user enters a query that matches multiple documents or yields non-unique results (such as "MYS" or "MYS01"), a list of results is displayed, allowing the user to select a specific passage to open its syntax tree; however, if the user enters a unique passage identifier (such as "MYS.1.1"), the syntax tree for that passage opens directly and immediately.
5. There is an issue with the current function for adjusting word spacing. First, the adjustment range is too limited. Second, collapsing the syntactic tree causes problems where very long sentences or words are not fully displayed, overlap with adjacent words, or have their corresponding kanji characters cut off or overlapping—issues that did not exist in the previous version. Please attempt to fix this; if a fix is ​​not possible, revert to the previous version and remove this feature.
6. The current way kanji characters are displayed is terrible. Revert to the display style used in the previous version. Simply add a bit more spacing between the characters and the horizontal line above them, and do not add any unnecessary boxes or background fills around the characters.
7. For the feature where clicking a word navigates to its corresponding dictionary entry, do not apply any formatting changes to the word—such as adding a dotted line underneath. This will conflict with formatting changes caused by other annotations, thereby leading to misunderstandings. Remove it.

### After commit 927c05b
1. Optimize node display during syntax tree collapse. The "-" symbol is not displayed under normal conditions; it only appears when the mouse hovers over a node. A "+" symbol is displayed after the node is collapsed, as it is now.
2. When a user opens the webpage, the default settings should have "lemma IDs," "script tags," and "align leaves" unchecked, while "kanji under transcription" and "Null nodes" should be checked.
3. Add an "Edit" button. The syntax tree can only be edited when the user clicks this button; only then will a pen icon appear next to the syntax tree nodes.
4. Add an activity bar to the left of the sidebar. Click the icon in the activity bar to expand or collapse the sidebar. Remove the current "collapse navigation" button; user feedback indicates it is counterintuitive and hard to notice.
5. Design a corresponding icon for the current sidebar that displays the syntax tree of the clicked document.
6. Design a sidebar with search functionality and an icon for it that can be placed in the activity bar. Users can search the text content across the entire data and browse the search results in the middle. When an open syntax tree page is displayed in the center of the screen, a new tab appears to show the search results. Users can switch between the two pages or close either or both of them.
7. Delete the "Current repository data" content at the top.
8. Sections of the syntax tree can also be collapsed or expanded, making it convenient for users who simply wish to browse the full text.
9. Move statistical data  "115 documents · 5,665 passages" from the top of the page to below the "documents" section. Delete "Browse current text and uploaded-tree XML" under "documents".

### After commit b7002bf
1. When user collapses the tree diagram to expand the text, it is impossible to scroll through the full text or view the title "tree diagram". Please fix this bug. Additionally, rename "tree diagram" to "syntax tree."
2. Highlight search results.
3. Delete the content 'CORPUS SOURCES' above 'Documents'. Delete the content 'CURRENT CORPUS' above 'Search'.
4. In the search function, users can set the search scope. Moreover, When there is a large number of search results, allow users to select the maximum number of results displayed per page and navigate between pages. This feature is hidden when the number of results is small to avoid a cluttered page layout.
5. Add advanced search functions. 
6. Design and add a dictionary icon to the activity bar. When user clicks it, it will open a new tab for dictionary. Basically, user can directly search word form, lemma id, gloss, and meaning. Also add an advanced search function which allows user to choose data categories and search the dictionary. Users can also choose to have the dictionary appear as a pop-up window on the right, which can be expanded or collapsed. This design is intended to allow users to quickly consult the dictionary while clicking on words in the syntax tree or during general use. Delete the previous dictionary function in Documents section.

### After commit c837543
1. Design and add a side bar for dictionary. Currently it doesn't have one when user clicks the activity bar. Add functionality to the sidebar to trigger editing and adding dictionary entries.
2. Revise the dictionary icon. It is difficult for users to associate the current icon with the dictionary.
3. Refine the advanced search function in dictionary. It should allow users to choose all tags in the dictionary (such asKana, Note and other tags) but not just the current meanings and glossings, to search. When users hover their mouse over the "match" option in the advanced search, they will see a brief explanation of these three modes ('contains', 'whole word', and 'exact field').
4. The quick search in the dictionary pop-up should only match the lemma ID, kana, and word form; do not match meanings or glosses. Search results are displayed based on relevance; for instance, results with the highest relevance are shown first.
5. Make the POS and gloss information stand out more in the dictionary's pop-up search results, and optimize the layout and display. This information is second in importance only to the word form itself, yet the current font size and color make it very uncomfortable to read.
6. Make the POS and gloss information stand out more in the dictionary's tab search results. Also display kana and frequency in search results. Frequency represents the total number of occurrences of the corresponding lemma ID's word within the database's text, excluding the dictionary entry itself. This figure must be updated in real time. When a user clicks on the frequency number, they will be directed to the search results page displaying the occurrences of words associated with that lemma ID; the search results must also be highlighted. Kana and frequency do not need to be displayed in the search results of dictionary side pop up.

### After commit c837543 (2)
1. The current search function is still very imperfect. It cannot search for the lemma ID. Also add TGrep2 Search function to help user search the structure of syntax tree.

### After commit c837543 (3)
1. There are issues with the highlighting of current search results. For example, when users search L051650, it will also highlight L000520 which sometimes has the same word form with L051650, but it is wrong - only L051650's word form should be highlighted.
2. User can choose whether to display kanji text and sentence number in search results. Sentence number could be like: [1] amatobuya [2] karu no miti pa.
3. The current occurrences in the dictionary is wrong. First, it should be named as frequency in dictionary. Second, there are errors in its search and statistical results. For example, when user uses TGrep2 to search lemma=L051650, it has 266 results. However, in dictionary, it shows 0 occurrences, so obviously it is wrong. Please fix this.
4. In dictionary entry search results, the color of the kana is a bit too faint and hard to see clearly. Use a darker color, but avoid making it too black so as not to distract the user too much.
5. In the text&lemma section in the search function, user still can not correctly search lemma ids. In general, the search result for lemma ids should match its corresponding branches. For example, in 
 <NUM lemma="L080703">
   <NUM lemma="L002003" phon="PHON" form="mi" index="1" inferred_index="1" />
   <NUM index="2" lemma="L002032" phon="PHON" form="swo" />
 </NUM>
when user searchs L002003, it should match mi. When user searchs L080703(if it is a compound lemma id), it should match leaves within this branch, miswo. 
6. Users can choose whether to display sentence numbers in the syntax tree.
7. When a user opens a syntax tree from the search results, the corresponding search result shoule be highlighted or otherwise marked within both the syntax tree and the text. If a user searches for components not selected for display in the syntax tree—such as lemma IDs or script tags—these components should be displayed in this situtation, and the corresponding results should be highlighted or marked. When a user opens a syntax tree from another location—such as the "Documents" entry point—these highlight markers and display states are reset, reverting them to the settings the user had selected during standard browsing. This means that this type of hightlighting is a specific state tailored for displaying search results. 
8. Extend the tgrep2 search functionality to allow searching for combining two attributes on the same node without conflicting with existing search features. For example, it should allow user to search a word form 'no' is written in PHON, and moreover, a NP includes a word form 'no' written in PHON.

### After commit c837543 (4)
The last update introduced a critical bug and failed to implement the features I wanted. I’ve already reverted the changes. Let’s try again—this time, making modifications bit by bit.
1. There are issues with the highlighting of current search results. For example, when users search L051650, it will also highlight L000520 which sometimes has the same word form with L051650, but it is wrong - only L051650's word form should be highlighted.

### After commit 8c999ef
Extend the tgrep2 search functionality to allow searching for combining two attributes on the same node without conflicting with existing search features. For example, it should allow user to search a word form 'no' is written in PHON, and moreover, a NP includes a word form 'no' written in PHON.

### After commit 0787851
The current occurrences in the dictionary is wrong. First, it should be named as frequency in dictionary. Second, it should be the search result in TGrep2 of that lemma id across the whole corpus. For example, when user uses TGrep2 to search lemma=L051650, it has 266 results. However, in dictionary, it shows 0 occurrences, so obviously it is wrong. Please fix this.

### After commit 06fd3c2
1. In dictionary entry search results, the color of the kana is a bit too faint and hard to see clearly. Use a darker color, but avoid making it too black so as not to distract the user too much.
2. Currently, the search results only display the transcriptions. Refine this: User can choose whether to display kanji text and sentence number in search results. 
#### Further revision
You misunderstand my meaning for 'User can choose whether to display sentence number in search results.'. Please revise this function. Display sentence number in search results means: for example, currently, the text in search result is displayed as: kamukazeno isenoumi no opwisi ni papimotoporopu sitadami no ipapimotopori utite si yamamu; after choosing to display sentence number, it becomes: [1] kamukazeno [2] isenoumi no [3] opwisi ni [4] papimotoporopu [5] sitadami no [6] ipapimotopori [7] utite si yamamu
The same way for displaying sentence numbers also applies to kanji text when user chooses to display sentence numbers: [1] 加牟加是能 [2] 伊勢能宇美能 [3] 意斐志爾...

### After commit 76a69e5
There are issues with the highlighting of current search results. The search results appear to be highlighted based on text matching rather than highlighting the actual corresponding search results. For example, when users search L051650, it will also highlight L000520 which sometimes has the same word form with L051650, but it is wrong - only L051650's word form should be highlighted.
Please remove the current search result highlighting feature and create a new one. It should only highlight the transcriptions corresponding to the search results. Specially, when the user searches for kanji characters, the system should highlight the corresponding characters if they are displayed in the search results; if the characters themselves are not displayed, it should highlight the entire sentence-level text transcription containing them. When a TGrep2 search result points to a phrase or sentence, the entire phrase or sentence should be highlighted; for such results spanning multiple words, the highlighting should appear as a continuous block rather than being broken up between words.

### After commit 40fd932
Now we have a good highlighting function in search results. Please add a function that highlights the corresponding part of the syntax tree when navigating to it from the search results. When a user opens a syntax tree from the search results, the corresponding search result should be highlighted (or otherwise marked) within the syntax tree. If a user searches for components not selected for display in the syntax tree — such as lemma IDs or script tags — these components should be displayed in this situtation, and the corresponding results should be highlighted or marked. When a user opens a syntax tree from another location — such as the "Documents" entry point — these highlight markers and display states are reset, reverting them to the settings the user had selected during standard browsing. This means that this type of hightlighting is a specific state tailored for displaying search results.

### After commit e3524a5 
Currently, when I search for kanji characters and navigate to the syntax tree, the entire kanji sentence containing that kanji character is highlighted. Please modify this so that only the specific character corresponding to the search result is highlighted within the syntax tree — do not highlight the entire sentence or the corresponding transliterated word.
The logic behind this is: Because this corpus currently does not map each kanji character to a specific transliteration, that's why I previously suggested mapping the characters to the transcription of the entire sentence when kanji is not displayed in search results but only highlight the corresponding characters if they are displayed in the search results. However, in the design of the highlighted syntax tree, parts that are normally hidden are also displayed; therefore, when displaying kanji characters, we only need to highlight the search results corresponding to those specific characters.

### After commit 0d3b51a
1. Rename the button on the right side of Stacked from 'Two columns' to 'Split'. Also change the default layout upon opening from "Stacked" to "Split".
2. Add a setting to the "Match" section of the 'Advanced search' for 'Text & lemmas' that allows users to choose whether or not to match space. This addition addresses potential discrepancies between users' word-segmentation habits and those of the corpus editors; for instance, a user might input "kwomoyo" (without spaces) and fail to find "kwo mo yo"(with spaces), yet the absence of spaces can also lead to segmentation ambiguity, making it necessary to give users the flexibility to toggle this setting on or off.
3. Please do not use dynamic search for "Text & lemma"; instead, change it to a model similar to 'TGrep2', where the search begins only after the user presses Enter or clicks the "Search" button. Dynamic search works very well for dictionaries with fewer search results. However, searches involving "Text & lemma" yield a vast number of results, causing significant lag during input and searching. This is why I want to make this modification.
4. Rename the button in Search from 'Text & lemma' to 'Text search'.
5. Re-layout the "Advanced search" section in the dictionary tab. Do not place "Match" and "Search in" on the same line; this is visually uncomfortable, as it forces users to shift their gaze all the way to the far right of the screen to view the "Match" settings.

### After commit 9eea0d5
As you may know, linguists typically prefer a text-based mode — such as that used in the Penn Treebank — when editing large volumes of syntactic trees; editing and viewing tree diagrams serves as a supplementary aid. However, directly editing the raw XML documents is tedious and inconvenient for linguists, so I want to convert them into a text format that is easier to edit and more comfortable to read, ensuring that any edits made can be mapped back to the XML without loss of equivalence.
I am considering adding a text-based editing mode to the current editor. However, I am not sure what form it should take or where it should be placed to ensure compatibility with the current editor's features while remaining convenient to use. Beyond direct editing, user scenarios may also include searching, replacing, and dictionary lookups. Support may also be required for automatic format detection, correction suggestions, and the insertion of existing data (such as branches, tags or lemma IDs). A feature is also needed that allows users to generate a simple tree diagram from any text they have written, in order to check for issues in the syntactic tree. This simple tree diagram must also be editable. This process of directly editing the text may alter dictionaries, the number and names of passages, existing tags, and so on. I am unsure whether these editing features can be properly implemented and integrated into the current editor, or if it would be better to make the current editor as a browser and seperate it with editor - retaining only minimal editing capabilities in the browser to allow users to make quick corrections.
In addition, I plan to merge another editor that uses scripts to assist with editing (the "script editor" folder) with the current editor and the future text editor. I am unsure how to go about this merger or how to ensure feature compatibility while maintaining ease of use.

### After commit 9eea0d5 (2)
The current frequency calculation in the dictionary is wrong; it should reflect the total number of matching nodes rather than the total number of texts found. For instance, a single long text might contain three matching results, but currently it will only be calculated as one. Please revise the calculation logic so that the frequency represents the count of matching nodes. Additionally, the search results interface should display both the number of search results and the number of texts separately.

### After commit c55b51c
A very serious bug has been found. In the data in .txt format, a certain category of words is not being correctly recognized and processed:
multi-sentence,IP-MAT;@4,IP-ADV,PP-ARG,IP-NMZ,VB-NML,L030199a,LOG,ipa
multi-sentence,IP-MAT;@4,IP-ADV,PP-ARG,IP-NMZ,VB-NML,L030199a,PHON,ku
Here is one word ipaku with a lemma id L030199a. The 'ipa' part is written in LOG and the 'ku' part is written in PHON.
In xml it is encoded as:
              </IP-ARG>
              <VB-NML lemma="L030199a" phon="LOG" form="ipa" />
              <VB-NML lemma="L030199a" phon="PHON" form="ku" />
            </IP-NMZ>
When generating the syntax tree, 'ipa' and 'ku' were generated as two separate nodes, but this is wrong. 

### After commit a36a1af
A very serious bug has been found. In the data in .txt format, a certain category of annotations is not being correctly recognized and processed. The removal of the kanji text from the syntax tree structure has resulted in removing some dividers between constituents. For example, in BS.1:
CP-FINAL,4@知知波波賀多米爾,*
CP-FINAL,NP-ADV,PP,NP,N,L050402,N,L050641,PHON,titi
CP-FINAL,NP-ADV,PP,NP,N,L050402,N;@2,L051720,PHON,papa
CP-FINAL,NP-ADV,PP,P-CASE-GEN,L000503,PHON,ga
CP-FINAL,NP-ADV,N,L050063d,PHON,tameni
CP-FINAL,5@毛呂比止乃多米爾,*
CP-FINAL,NP-ADV,PP,NP,N,L050486,ADJ-STM,L007011,PHON,moro
CP-FINAL,NP-ADV,PP,NP,N,L050486,N,L050046,PHON,pito
CP-FINAL,NP-ADV,PP,P-CASE-GEN,L000520,PHON,no
CP-FINAL,NP-ADV,N,L050063d,PHON,tameni
This part actually contains two NP-ADVs, though they are separated by the kanji characters.This type of structure is characterized by the fact that the parent node preceding the kanji text does not include NP-ADV: 'CP-FINAL,5@毛呂比止乃多米爾,*'.
However, in xml data they are encoded and presented as one NP-ADV, but this is wrong:
      <NP-ADV>
        <PP>
          <NP>
            <N lemma="L050402">
              <N lemma="L050641" phon="PHON" form="titi" index="1" inferred_index="1" />
              <N index="2" lemma="L051720" phon="PHON" form="papa" />
            </N>
          </NP>
          <P-CASE-GEN lemma="L000503" phon="PHON" form="ga" />
        </PP>
        <N lemma="L050063d" phon="PHON" form="tameni" />
        <PP>
          <NP>
            <N lemma="L050486">
              <ADJ-STM lemma="L007011" phon="PHON" form="moro" />
              <N lemma="L050046" phon="PHON" form="pito" />
            </N>
          </NP>
          <P-CASE-GEN lemma="L000520" phon="PHON" form="no" />
        </PP>
        <N lemma="L050063d" phon="PHON" form="tameni" />
      </NP-ADV>
Please check and correct this type of encoding bug, while ensuring it can be correctly converted back to the original .txt file. After the modifications, generate a report that includes at least the following: 1. the number of modified lines; 2. IDs of the text containing them and the original content in .txt format. Similar to things you have done for 'ipaku', put the report in 'reports' folder and create a repeatable migration utility.

### After commit 40a4a37
Add an option to display the gloss for each word in the syntactic tree. Automatically adjusts spacing when displaying different types of content to ensure a comfortable visual experience.The gloss should be placed beneath each word; for compound words, it should be placed beneath the corresponding node—for example, under a VB-ADC node. "Gloss" refers to the content found in the ".GLOSS" section in the dictionary. Retain other existing functions and avoid causing severe conflicts with them.

### After commit 0ba48ae
The gloss display functionality is implemented, but the UI needs optimization.
1. Rename the "Kanji under transcription" button to simply "Kanji".
2. In the annotation panel, the default state upon opening should have "Glosses" and "Kanji" checked, while "Script tags" and "Lemma IDs" are unchecked.
3. The order of the function selection checkboxes should be: Glosses, Kanji, Script tags, Lemma IDs.
4. Do not display the "Place below" checkbox when "Lemma IDs" is unchecked; show it only when "Lemma IDs" is selected. This checkbox must always be positioned immediately after "Lemma IDs" to avoid confusion.
5. Reduce the spacing between the kanji text and the word within the node to half the current distance. At the same time, ensure there is no content overlap between the nodes and other elements (such as glosses or lemma IDs), as overlap would make the content difficult to read.
Retain other existing functions and avoid causing severe conflicts with them.

#### After commit 0ba48ae (2)
1. When lemma IDs are placed under the tags, they overlap slightly with the upper part of the words.
2. The layout settings should always be placed on a new line below the annotations.
3. Currently, the kanji characters are too close to the horizontal line above them, whereas the distance between that line and the word itself is just right. Please increase the spacing between the Chinese characters and the horizontal line above. 

### After commit e041b62
Users require a display function optimisation: the text remain segmented after collapsing nodes in the syntactic tree. 
For example, when collaspe ipapo sura as a PP-OB1, the UI currently shows ipaposura as a whole. The current function does not support user to see ipapo sura. Also, it will not display the gloss for ipapo and sura when collasping nodes.
Refine this function to allow user see the segmentation after they collapse the nodes. Users need the text to remain segmented after collapsing nodes in the syntactic tree, and still to be able to view the gloss for each word.
Retain other existing functions and avoid causing severe conflicts with them.

### After commit 6f3285e
Users would like a checkbox to toggle whether the full labels for syntactic tree nodes are displayed. This checkbox should be positioned after the "script tags" and before the "lemma IDs." Name it as "Expand abbr". 
For example, when checked, the node labeled "ADN" in the syntactic tree would be displayed as "Adnominal." This feature aims to help users unfamiliar with the abbreviations quickly understand what each node label means, without having to repeatedly consult a reference table.
For the rules regarding the expansion of abbreviations within syntactic tree nodes, please refer primarily to "D:\Lanxin\Desktop\ONCOJ Abbr List.docx". Ignore any hyperlinks in that document. Integrate this table into the repository and note that the source of the information is ONCOJ (https://oncoj.orinst.ox.ac.uk/cgi-bin/oncoj_tgrep2.sh).
At this stage, do not include parenthetical information when displaying expanded content. For example, expand "CP" to "complementizer phrase" rather than "complementizer phrase (used in CP-FINAL, clauses with a right dislocated element)." Specifically: 1. Expand "-APP" to "apposition." 2.-PRP	to purposive subordinate clause 3. -FINAL to clauses with a right dislocated element 4.NULL	to null element
For any unmapped tag, retain its original label rather than guessing a meaning.
Retain other existing functions and avoid causing severe conflicts with them.

### After commit b29018e
Keep the hyphens in the expanded forms of the different abbreviations—for example, expand "VB-ADN" to "Verb - syncretic adnominal and conclusive." The current format results in strings that are too long and visually cluttered.
Additionally, please allow the expanded form to appear when a user hovers their mouse over a node. For instance, hovering over "VB-ADN" should display "Verb - syncretic adnominal and conclusive." This is to accommodate users who may only be unfamiliar with a few of the abbreviations; expanding all of them at once would be too cumbersome for such users.
Retain other existing functions and avoid causing severe conflicts with them.

### After commit 873129e
I would like to add a new feature to the existing project, with its entry point tentatively placed below **Dictionary**. 
Before modifying any code, please first inspect the current project structure and relevant implementations. 
**Do not start implementing the feature yet.** I would first like you to analyze the design, identify ambiguities, and discuss the architecture with me. 
 
Core Interaction 
The feature should use a two-pane / split-view workspace: 
- The page can be chosen to divided into left and right panes. 
- The two panes should be independently scrollable; synchronized scrolling is not required. 
- Users should be able to enter, paste, or load content into either pane where appropriate. 
- Depending on the selected mode, the workspace should compare, transform, parse, or visualize the content. 
- I may add more modes in the future, so the architecture should preferably be extensible rather than tightly coupled to the three initial modes. 
 
At the moment, I have three modes in mind. 
1. Text Comparison 
This mode compares text in the left and right panes. 
Basic requirements: 
- Compare the two text strings. 
- Clearly visualize differences between them. 
- Additions, deletions, and modifications should be distinguishable using colors or other appropriate visual indicators. 
- The main goal is to allow users to locate differences between two texts quickly. 
 
I have not yet decided whether the comparison should operate at the character, word, or line level, or whether users should be able to switch between different diff granularities. If this decision affects the architecture significantly, please point it out. 
 
2. Transliteration / Conversion 
This mode converts between different writing or transcription systems. 
For example: 
- Japanese kana → romanization 
- Romanization → Japanese kana 
Where possible, conversion should use rules already stored in the project's database rather than hard-coding conversion rules directly into the UI component. 
I may later add other languages or other types of transcription, transliteration, or orthographic conversion, so this mode should ideally be designed with extensibility in mind. 
 
My current idea is that the left pane acts as the source and the right pane displays the converted result. However, I have not decided whether conversion should also support easily reversing or swapping the direction. Please make a recommendation based on the existing architecture and UI. 

3. Syntax Tree 
This mode visualizes syntactic trees from user-provided data. 
Basic requirements: 
- Users can paste or load data representing a syntax tree. 
- Initially, I would like to consider at least the current content in TXT and XML input, with the possibility of supporting additional formats later. 
- The input should be parsed and rendered as a simple, readable tree diagram. 
- The left and right panes should be able to display two separate syntax trees. 
- Users should be able to compare the two trees. 
- If practical, structural differences between nodes, labels, or branches should be highlighted visually, for example with different colors. 

Questions to Address Before Implementation 
After inspecting the existing project, please help me answer the following questions: 
1. **What should this overall feature be called?**   
   Please suggest several concise English names suitable for a UI navigation entry and explain what each name emphasizes. Names such as **Workbench**, **Language Lab**, or **Analysis** may be possibilities, but please do not limit yourself to these. 
2. **Do Text Comparison, Transliteration / Conversion, and Syntax Tree belong under the same top-level feature?**   
   Please evaluate whether grouping them together makes conceptual and architectural sense. 
3. **If they should be grouped together, what UI and component structure would you recommend?**   
   For example, one possible structure might be a shared workspace with mode selection such as: 
   `Compare | Convert | Syntax Tree` 
   However, please base your recommendation on the existing project rather than assuming this is necessarily the best design. 
4. **Which underlying capabilities should be shared between the three modes, and which should remain mode-specific?** 
5. **How should the architecture be designed so that additional linguistic comparison, conversion, transcription, annotation, or visualization tools can be added later without major restructuring?** 
6. **After inspecting the current codebase, identify the main files, components, data structures, or modules that would likely need to be added or modified.**   
   At this stage, please only describe the proposed changes; do not make them yet. 
7. **Identify any ambiguities in my requirements that could materially affect the UI, data model, component architecture, or implementation.**   
   Ask me about these points explicitly rather than making irreversible assumptions. 
 
One architectural distinction I would also like you to consider is whether the **split-pane layout should be a general workspace primitive rather than something specifically tied to comparison**. 
 
For example: 
 
- Text Comparison naturally represents `A ↔ B`. 
- Syntax Tree Comparison also naturally represents `Tree A ↔ Tree B`. 
- Transliteration is somewhat different and may be better understood as `Source → Result`. 
 
They can all use a visually similar two-pane layout, but the semantic relationship between the panes is not necessarily the same. I would therefore prefer not to prematurely design the shared component around the assumption that both panes always represent two things being compared. 
 
For now, please **inspect the codebase and return only your design analysis, naming suggestions, proposed architecture, and clarification questions**. 
 
Do not implement the feature until we have resolved these design decisions.

#### After commit 873129e (2) - Answer to questions
1. Workbench

2. The primary layout should be a two-pane view.

However, the underlying workspace should also allow the user to close either pane and temporarily switch to a single-pane view. After closing a pane, it should be easy to restore the two-pane layout.

In other words, two panes should be the default and primary design, but the workspace component should not structurally require both panes to remain visible at all times.

3. The user should be able to choose whether spaces and line breaks count as differences.

By default, they should not count as differences. The default comparison should therefore focus on the textual content while ignoring whitespace differences.

The comparison itself should ultimately operate at the character level. Every differing character or character sequence should be highlighted so that the user can see all differences, rather than only being told that a line is different.

Line-level alignment may still be useful internally or visually for larger texts, but I do not want it to replace character-level difference highlighting.

4. The converter should allow the user to explicitly select the format/transcription system of the input and output, while also supporting automatic format detection where reasonably reliable.

The available systems should eventually include both:

Old Japanese transcription systems

Modern Japanese romanization systems

The exact conversion rules are not complete yet and will be expanded later. Therefore, please design the conversion system so that new rule sets and transcription systems can be added without rewriting the converter itself.

For now, you may research documented conversion/transliteration conventions from reliable sources where necessary. However, there must be a clear distinction between:

project/user-defined rules that I have explicitly specified or approved; and

provisional/reference rules introduced on the basis of external sources during development.

These categories should not silently overwrite one another. Explicitly defined or approved project rules must always take precedence over provisional/reference rules.

Please also keep enough provenance or metadata to make it possible to identify where a rule came from and whether it has been explicitly approved. Do not silently convert externally researched assumptions into authoritative project rules.

5. Reverse ambiguity

For ambiguities such as historical katakana キ corresponding to either ki or kwi, this is an unavoidable limitation when the kana representation does not preserve the relevant Old Japanese distinction.

For this specific class of Old Japanese transcription ambiguity, use a conventional default when the distinction is not represented in the source:

キ → ki rather than kwi

similarly, where the relevant historical distinction is absent, default to e rather than ye

default to o rather than wo

However, these should not be presented as unambiguous conversions. The output should visually highlight such cases, using a distinct color or other indicator, so that the user knows that information has been lost and that the result may require manual review.

Ideally, hovering over or otherwise inspecting the highlighted result should explain the ambiguity and show the possible alternatives.

For other types of ambiguity where there is no explicitly defined default convention, the interface should show the available alternatives rather than silently choosing one.

Please keep these ambiguity policies configurable rather than hard-coding them deeply into the UI, because I may refine the Old Japanese conversion rules later.

6. Tree input

Normally, the user will supply one text/tree per pane.

After input has been parsed, each pane should allow the user to switch between:

the original/source representation, and

the rendered tree view.

The original input should therefore remain available after parsing rather than being discarded.

I would also like users to be able to enter a text identifier, for example MYS.1.1, to load a text that already exists in the project's corpus/database and use it as the input for that pane.

For now, I do not think the Workbench needs to treat an entire multi-text corpus document as a single tree input. The normal unit should be one text/tree in each pane.

7. Tree differences

I am not yet sure what you mean by identifying moved/reparented branches.

For the first version, I only need the system to identify and visually highlight differences between the two trees. We do not need an advanced structural-change classification system unless it is necessary for basic comparison.

Please explain briefly what moved/reparented branch detection would add before we decide whether it is needed later.

8. Storage

For now, I would like Workbench to behave primarily as a temporary workspace.

Its contents do not need to be permanently stored locally when the browser or application is closed.

Temporary in-session caching is fine if useful, for example so that switching between Workbench modes or tabs does not immediately destroy the user's current work.

However, please design the state management so that persistent storage or explicit save/load functionality could be added later without requiring a major redesign.

9. Result editing

For the first version, converted output does not need to be directly editable.

The user should be able to copy the result.

We may add an editing interface later, so please avoid designing the result pane in a way that would make editable output difficult to support in the future.

I am not yet sure whether a dedicated “copy result back into source” action is necessary. Standard copying is sufficient for the first version.

10. Corpus integration

If by “send the currently open corpus text/tree into either pane” you mean adding an action that takes the text or tree currently open elsewhere in the application and directly loads it into a Workbench pane, I do not think this is necessary for the first version.

For now, users can paste/load content manually or load an existing corpus text by entering its identifier, as described above.

However, please keep future direct integration with the main corpus/document view possible.

Before implementation, please respond to the points where I have asked for clarification, especially:

what you mean by moved/reparented branch detection;

whether my proposed character-level comparison with optional whitespace ignoring creates any technical or UX issues;

how you propose representing the distinction between approved/project-defined conversion rules and provisional/reference rules;

whether the current corpus architecture can support loading a single text by an identifier such as MYS.1.1 cleanly.

If there are any remaining decisions that materially affect the architecture, please ask me before implementation.

#### After commit 873129e (3) - Answers to questions
Thanks. I agree with the proposed approach. Here are my answers to the remaining questions.

1. Corpus source view: offer both TXT and XML

I would like the Workbench to offer **both TXT and XML representations**.

However, I think there may be one point about the current data flow that needs to be rechecked.

My understanding is that, in the current corpus architecture, **XML is generated from the TXT source**, rather than TXT being generated from XML. The syntax-tree/display data may currently be obtained from the XML representation, which might explain why reconstructing TXT from XML came up in your analysis.

Before implementation, please verify the actual source-of-truth and conversion pipeline in the current codebase.

In particular, please determine:

- whether the original TXT is the authoritative source from which XML is generated;
- whether a specific text such as `MYS.1.1` can be retrieved directly in its TXT representation;
- or whether the existing per-text APIs only expose XML/tree-derived data, in which case producing a per-text TXT view would currently require serialization/reconstruction.

If the original TXT representation for an individual text is directly available, I would prefer to use that rather than reconstructing TXT from XML.

Regardless of the internal source, the Workbench should support **both TXT and XML**, because manually pasted or loaded input may itself be supplied in either representation.

Please make the UI clear about whether a displayed representation is the original/source representation or a generated/serialized representation where that distinction is relevant.

2. Whitespace scope

Yes. **Ignore spaces** should include tabs, full-width spaces, and other appropriate Unicode spacing characters.

Line breaks should remain a separate option, controlled independently by **Compare line breaks**.

As discussed, both **Compare spaces** and **Compare line breaks** should be off by default.

For character-level comparison, please use a Unicode-aware notion of a visible character (grapheme cluster) where appropriate, so that combining characters are not incorrectly split during comparison or highlighting.

3. Unresolved conversion alternatives

I agree with your recommendation.

Where no approved/default conversion exists, use a **marked unresolved placeholder** in the result, with an inspection interface that shows the possible alternatives and allows the user to select one.

I prefer this to displaying all alternatives inline, because inline alternatives would become part of the converted text itself.

For the first version, no additional warning when copying unresolved results is necessary. We can consider that later if it becomes useful.

4. Initial conversion scope

For the first version, please keep the actual conversion scope relatively narrow.

The initial systems should be:

- **Old Japanese:** Frellesvig–Whitman notation
- **Modern Japanese:** Hepburn romanization
- the corresponding kana representations needed for those conversions

For Old Japanese, I suspect the existing implementation in `kana.py` may already correspond to, or at least be based on, Frellesvig–Whitman notation. Please verify this from the actual rules and existing project context rather than assuming that it does.

The first release does **not** need to implement every possible Japanese transcription system.

The important architectural requirement is that additional systems can be registered later without redesigning the converter. For example, future systems might include:

- Frellesvig–Whitman → Yale
- Frellesvig–Whitman → Historical Katakana
- additional Old Japanese transcription conventions
- additional modern Japanese romanization conventions

These are examples of future extensibility, not requirements for the first release.

Please also preserve the rule-authority model we discussed earlier: project-defined/approved rules take precedence over provisional/reference rules, and the origin/status of rules should remain identifiable.

5. Closing a pane

Yes. Closing a pane should **hide it while retaining its contents and state for the current session**.

Restoring the pane should restore its previous content rather than creating an empty pane.

This does not imply permanent persistence across application/browser restarts.

With these decisions, I think the main product requirements are sufficiently defined.

Before beginning implementation, please first verify and report back on the two codebase-specific points above:

1. the actual TXT → XML → tree/display data flow and whether a single text's original TXT can be retrieved directly by ID;
2. whether the existing `kana.py` rules actually correspond to Frellesvig–Whitman notation, and exactly which conversion direction(s) they currently implement.

If those checks do not reveal any additional architectural decisions that require my input, you can then propose the implementation sequence.

#### After commit 873129e (4)
Your findings make sense. I agree with the proposed implementation sequence, with the following clarifications.

1. Source TXT vs. Stored XML

For corpus-loaded texts, I would prefer **Source TXT** as the default, since TXT is the primary authoring representation.

If Source TXT and Stored XML differ, please make that discrepancy visible and allow the user to inspect either representation rather than silently choosing one.

Workbench only needs to keep enough **temporary in-session state** to know whether the content currently shown was:

- read from Source TXT;
- read from Stored XML; or
- generated temporarily through conversion.

This is only so the UI can accurately tell the user what they are viewing. **Do not create or persist additional TXT/XML copies, and do not modify the existing corpus files for this purpose.**

2. Use a separate lightweight tree view for Workbench

I would like to change one part of the implementation plan:

**Please do not modify or refactor the existing tree renderer for Workbench.**

Instead, create a separate, lightweight tree view specifically for Workbench. Its purpose is quick proofreading and side-by-side comparison, so it does not need features such as node collapsing, editing, draft state, or the other interactions of the existing graphical tree.

The main design goal is for the tree to grow primarily **downward rather than horizontally**, so that two trees can be compared comfortably side by side.

I have not decided on the exact visual design. One possible compact representation might look roughly like this:

```text
CP-FINAL
    ├── IP-SUB
    │   ├── IP-ADV
    │   │   ├── PP
    │   │   │   ├── NP
    │   │   │   │   ├── IP-EPT
    │   │   │   │   │   └── MK ( tamakiparu PHON-KUN [L091056] )
    │   │   │   │   ├── PP
    │   │   │   │   │   ├── NP
    │   │   │   │   │   │   └── PLN ( uti PHON-KUN [L090040] )
    │   │   │   │   │   └── P-CASE-GEN ( no PHON [L000520] )
    │   │   │   │   └── N
    │   │   │   │       ├── ADJ-STM ( opo LOG [L007009a] )
    │   │   │   │       └── N ( nwo LOG [L051650] )
    │   │   │   └── P-CASE-DAT ( ni PHON [L000519] )
```

This is **only an example of what I mean by a vertically oriented, horizontally compact tree**. I do not necessarily want the final UI to use this exact file-tree/ASCII style. Please choose a visual implementation that fits the existing interface.

The priorities are:

- compact horizontal width;
- clear parent-child relationships;
- easy side-by-side comparison;
- simple visual structure.

3. Node contents and comparison

For lexical nodes, the word form should be clearly visible together with its annotations, for example:

`PFX-HON   mi (L000035, PHON)`

The exact typography is flexible. However, the renderer/comparison logic should still distinguish between:

- node/category label;
- word form;
- lemma ID;
- annotations.

This way, if only one field differs between two corresponding nodes, that field can be highlighted rather than treating the entire row as different.

Subtle color differences between semantic fields would also be useful where appropriate—for example, displaying a lemma ID and an annotation such as `PHON` differently.

Tree comparison should consider both node contents and parent-child structure. V1 does not need to identify moved/reparented branches as a special type of change; it only needs to highlight the differences clearly.

4. Small optional conveniences

If straightforward to implement, I would also like:

- a **Show glosses** checkbox;
- hover tooltips showing the full meaning of abbreviations where that information already exists;
- clicking a lemma ID such as `L000035` to open the existing Dictionary popup.

These are useful for quick proofreading, but they are **not essential for V1**. In particular, please do not create unnecessary coupling with the existing tree renderer just to support them.

The existing tree renderer should remain unchanged.

Please update the implementation plan based on these clarifications. If no new architectural or corpus-data decisions are required, you can proceed with implementation.

#### After commit 873129e (5)
This revised plan looks good. You have my approval to begin implementation.

Two small scope clarifications before you proceed:

1. For Source TXT vs. Stored XML, when I asked you to expose discrepancies, I primarily meant that Workbench should clearly indicate when the two representations differ and allow the user to inspect both. Please do not expand this into a separate semantic-difference analysis system unless that is already naturally required by the implementation.

2. For conversion rules, provisional/reference rules may be used where necessary for V1, but they must remain clearly distinguishable from project-defined or explicitly approved rules. A convention that you find through research should not automatically become a project-approved rule.

Otherwise, please proceed according to the revised implementation plan.

Please keep the existing graphical tree renderer unchanged, as planned. If implementation reveals a new issue that requires a substantive decision about corpus data, conversion semantics, or the Workbench architecture, ask me before making that decision.

### After commit 2cc6e1c
I have tested the first Workbench implementation. The overall structure is fine, but several details need revision.
Please keep the current overall Workbench architecture and address the following issues.

1. Workbench sidebar
The text at the bottom of the sidebar:
> Work stays in this browser session. Closing a pane hides it; restore it to continue.
currently overlaps the **Syntax Trees** button.
Please move this note further down / adjust the sidebar layout so that it does not overlap any mode buttons.

2. The workbench does not need the function **Load File** for now. Please remove it at this stage.
Also simplify the interface and give the panes more space.
I also do not currently need the **Copy Input** button. Please remove it.
Keep the UI **Clear**. Please make the remaining controls more compact and move the two main panes upward where possible. The priority should be giving users as much visual space as practical for reading the input and comparison results. In general, avoid spending vertical space on controls that are not necessary for the basic comparison workflow.

3. Convert: correct the conversion model

The current Convert implementation does not reflect my main intended use case, and at the moment I also cannot seem to get useful conversions from it.
The primary purpose of Convert is **conversion between kana and romanization**, plus conversion between the two supported romanization systems.
For V1, I need these three representations:
- **Japanese kana**
- **Modern Hepburn romanization**
- **Old Japanese Frellesvig–Whitman romanization**

The required conversion relationships are:
```text
Kana ↔ Modern Hepburn
Kana ↔ Frellesvig–Whitman
Modern Hepburn ↔ Frellesvig–Whitman
```
Note that kana can be hirakana or katakana.

Conceptually, for example:
```text
たらちし
   ↕
tarachishi     (Modern Hepburn)
   ↕
taratisi       (Frellesvig–Whitman)
```

Here `taratisi` is an example illustrating the intended relationship, temporarily ignoring Old Japanese kō/otsu distinctions where the kana itself does not encode them. Please do not treat this single example as the complete definition of the Frellesvig–Whitman system.

The important conceptual point is that these are **different written/transcription representations of the same linguistic content**. Convert is not primarily intended to convert “Old Japanese” into “Modern Japanese.”

Please first make these six directions function correctly:
- Kana → Hepburn
- Hepburn → Kana
- Kana → Frellesvig–Whitman
- Frellesvig–Whitman → Kana
- Hepburn → Frellesvig–Whitman
- Frellesvig–Whitman → Hepburn

For ambiguous reverse mappings in Frellesvig–Whitman, retain the ambiguity/default behavior we previously discussed.

Eventually, the UI should support automatic detection or otherwise make it easy to distinguish the input representation, but **reliable conversion functionality is more important than automatic detection for this revision**. Please get the explicit source/target selections working correctly first.

No additional transcription systems are needed at this stage.

4. Convert: swap control

Please replace the current **Swap direction** button with a compact **bidirectional-arrow control** between the source and target selectors, similar in interaction concept to the swap-language control in Google Translate.
It should swap the selected source and target representations without taking unnecessary UI space.

5. Syntax Trees: make parent-child relationships visually clear
The current tree representation is difficult to read because the vertical lines do not make the tree structure sufficiently clear.
I would like the compact tree to use connectors that visibly show the relationship between each parent and its children.
For example, the general visual principle could resemble:

```text
S
├── NP
│   └── 句子
└── VP
    ├── VV
    │   └── 竖
    ├── AS
    │   └── 着
    └── VV
        └── 画

OR:

PP
├── NP
│   ├── IP-EPT
│   │   └── MK ( tamakiparu PHON-KUN [L091056] )
│   ├── PP
│   │   ├── NP
│   │   │   └── PLN ( uti PHON-KUN [L090040] )
│   │   └── P-CASE-GEN ( no PHON [L000520] )
│   └── N
│       ├── ADJ-STM ( opo LOG [L007009a] )
│       └── N ( nwo LOG [L051650] )
└── P-CASE-DAT ( ni PHON [L000519] )
```

This is again an **illustration of the desired structural readability, not a requirement to literally render ASCII characters**.
The important requirement is that users should be able to follow the connecting lines from a parent node to its children immediately. A CSS/HTML implementation with proper branch connectors is preferable if it produces a cleaner result.
The tree should remain vertically oriented and horizontally compact, because the main purpose is still side-by-side comparison.
Please preserve the semantic separation of category labels, word forms, lemma IDs, and annotations from the existing implementation.

Scope
Please treat this as a refinement of the current Workbench rather than a redesign of the whole feature.
In particular:
- keep the existing Workbench architecture where it is working;
- continue to leave the original graphical tree renderer unchanged;
- do not add additional conversion systems yet;
- prioritize usable pane space and a simple proofreading workflow.
Please inspect the current implementation against these requirements, make the revisions, and run the relevant tests afterward. If the conversion requirements reveal a genuine linguistic ambiguity that requires a decision from me rather than an implementation detail, ask me instead of silently choosing a convention.

### After commit 1bd6959
I would like to add several features to Workbench. Items 1 and 2 can be implemented now. Item 3 includes a small current UI improvement followed by a larger feature that needs design analysis before implementation. Item 4 is a future enhancement and does not need to be implemented yet.

1. Text Compare: temporary extraction / preprocessing
Users sometimes paste annotated corpus data into Text Compare when they only want to compare the underlying text or transcription.

For example:

IP-MAT,0@春去者,*
IP-MAT,PP,NP,IP-REL,IP-ADV,NP-SBJ,N,L051724,LOG,paru
IP-MAT,PP,NP,IP-REL,IP-ADV,VB-CND,L030841a,LOG,saraba
IP-MAT,PP,NP,IP-REL,1@挿頭爾將爲跡,*
IP-MAT,PP,NP,IP-REL,IP-ARG,IP-ARG,NP-PRD,DVN,L030454b,LOG,kazasi
IP-MAT,PP,NP,IP-REL,IP-ARG,IP-ARG,COP-INF,L031965,PHON,ni
IP-MAT,PP,NP,IP-REL,IP-ARG,VB-ADC,VB-STM,L030919a,LOG,se
IP-MAT,PP,NP,IP-REL,IP-ARG,VB-ADC,VAX-CJR-ADC,L000002,LOG,mu
IP-MAT,PP,NP,IP-REL,IP-ARG,P-COMP,L000530,PHON,to

I want each Text Compare pane to support temporary preprocessing before comparison.

For V1, please add two extraction modes:
a. Extract kanji characters
Keep only kanji characters.
Separate character sequences that occur in different locations in the source with spaces.
For the example above, the result should be:
春去者 挿頭爾將爲跡
b. Extract the lexical field from the relevant rows
For the example above:
paru saraba kazasi ni se mu to
The purpose is to make it easy to compare the kanji text or romanized text against another edition or transcription without the syntactic annotation.
These transformations must be non-destructive. Do not modify the pasted input or corpus data. They should only produce a temporary representation used for comparison.
Please keep the mechanism simple but extensible enough that additional preprocessing options could be added later.

2. Text Compare: directly select preferred differences and copy the result

After Text Compare identifies differences, I want the user to be able to construct a resolved result by choosing which version to keep.

Make the differing text itself interactive.
For example, if the panes contain:
A:   paru saraba kazasi
B:  paru saraba kasasi
the user should be able to click directly on kazasi to choose the A version, or click directly on kasasi to choose the B version.
The selected version should be visually obvious, and clicking the corresponding difference on the other side should switch the selection.

The resulting workflow should be approximately:
Input A + Input B → Compare → click preferred differences → resolved result → Copy Result
The original inputs must remain unchanged.

Please keep this interaction visually lightweight. The purpose is to let the user proofread differences and choose the preferred reading directly, rather than operate a separate merge-control interface.

3. Syntax Trees

Current UI improvement: make Parse Tree prominent
The current Parse Tree action is too difficult to find because it is visually mixed together with the other controls.
Parsing is one of the primary actions in Syntax Trees, so please make Parse Tree noticeably more prominent and easy to locate.
You can adjust its placement, grouping, visual hierarchy, or button treatment as appropriate for the existing Workbench design. I do not have a fixed visual design in mind.
The goal is simply that when a user enters or pastes tree data, it should be immediately obvious what they need to click to generate the tree.
Please implement this UI improvement in the current version.
Future feature: text-editor-like structured tree editing
I would eventually like to edit the Workbench tree directly, but I do not think a conventional graphical tree editor with many Add Parent / Add Child / Move buttons is the interaction I primarily want.
I would prefer something closer to editing structured text while preserving a visible tree structure.
For example, the user might see something conceptually like:

CP-FINAL
├── IP-SUB
│   ├── NP-SBJ
│   │   └── N ( paru LOG [L051724] )
│   └── VP
│       └── VB ( saraba LOG [L030841a] )

and be able to interact with it in a way closer to a text editor:
click into a node and directly edit its label or lexical information;
press Enter to create a new node/line;
use indentation to change hierarchy;
delete nodes directly;
select and copy/cut/paste a node or subtree;
move a subtree by cutting/pasting or another similarly simple operation;
edit several lines/nodes without repeatedly opening operation dialogs.
The user should not need to manually maintain characters such as ├──, │, and └──. Those connectors should preferably be generated automatically from the underlying hierarchy.
A possible interaction model might therefore use:
Enter for a new sibling;
Tab to indent a node / make it a child where structurally valid;
Shift+Tab to move it outward one level;
normal editing for node contents;
normal copy/cut/paste behavior for nodes or subtrees;
automatically updated branch connectors.
These exact keyboard behaviors are only a design suggestion, not yet a fixed specification.
The important goal is that editing should feel direct and text-like, while the application continues to understand the content as a structured tree.
A small context menu or explicit structural commands could also exist as a secondary method if useful, but I do not want menu-driven structural editing to be the primary workflow.
Most importantly, edits made in this view must be reflected equivalently in the underlying TXT/XML representation. The visual tree and source representation must not become independent copies that can silently diverge.
Do not implement this tree editor yet.
First inspect the current parser, tree model, TXT/XML representations, and serializers and give me a design analysis covering:
Whether this kind of text-editor-like structure tree editing is feasible with the current data model.
What editable intermediate tree model you would use.
How direct edits, indentation changes, copy/paste, and subtree movement would map back to the existing TXT/XML formats.
Whether round-tripping can preserve all relevant annotations and source information.
What should happen when the user performs an invalid structural edit.
How the editable tree and raw source view should stay synchronized.
Whether undo/redo should be built into the editing model from the beginning.
What interaction model you recommend after considering the existing application architecture.
Please identify any cases where this editing model could lose information or create ambiguity before we implement it.
The existing graphical tree renderer should remain unchanged.

4. Future pane improvements
Later, I may want to improve the Workbench pane system with features such as:
dragging the divider to resize pane proportions;
controls similar to VS Code for increasing or decreasing the number of panes.
These are not current priorities. Do not implement them now.

For this iteration, please:
implement Items 1 and 2;
make the current Parse Tree action more prominent;
otherwise leave the current tree comparison/viewer working as it is;
analyze the proposed direct tree-editing model and report your design before implementing it;
leave the pane improvements in Item 4 for later.
If the requested implementation reveals a substantive ambiguity that affects the intended behavior rather than merely an implementation detail, ask me before making that decision.

### After commit e15ad38
Please read the rules below carefully.
If any rule is ambiguous, underspecified, internally inconsistent, or open to more than one reasonable interpretation, do not make assumptions. Ask me for clarification first. In particular, if you are unsure how a rule should apply to a specific structural configuration or edge case, ask me before formalizing it.
Once all ambiguities have been resolved, organize the confirmed rules into the dataset in a clear and systematic document.
1. Words and lexical items.
A word is, in essence, an item annotated under the tags in Parts of speech: Words.
Structurally, it can also be understood as a node that is directly connected to a phrase node.
Items of this type are lexical items.
2. Bound morphemes and grammatical items
Items annotated under Parts of speech: Bound morphemes are grammatical items.
3. Lexical vs. grammatical items in the syntactic tree
The current annotation system distinguishes between lexical items and grammatical items in the syntactic tree.
4. Assignment of lemma IDs
The assignment of a lemma ID is not determined by whether a form is classified as a lexical item or a grammatical item.
Instead, a lemma ID should, in principle, be assigned to each form or expression that a reader would reasonably expect to find as an entry in a dictionary.
Therefore, an item with its own lemma ID may be, for example, a lexical item, a grammatical item, or another form/expression that warrants an independent dictionary entry.
5. Formation of new lexical items
As a general rule, a combination of lexical item + lexical item may create a new lexical item.
By contrast, a combination of lexical item + grammatical item normally does not create a new lexical item.
One possible reason for this distinction is that combinations between grammatical items and lexical items are relatively productive according to grammatical rules. They therefore do not normally need to be treated as independent lexical items.
Possible exceptions include grammatical items belonging to the following categories: PFX,SFX,CL.
Combinations involving these grammatical items and lexical items may sometimes need to be treated as new lexical items, because the possible combinations are not always fully free or predictable.

Instruction for formalizing these rules
Before adding these rules to the dataset, identify any points that still require an operational definition. 
If the current rules do not specify how to classify a particular case, ask me for a decision. After I answer, incorporate the clarified rule into the dataset so that the resulting annotation guidelines are explicit and reusable.

#### After commit e15ad38 (2)
Here are my clarifications. Some questions still require concrete examples before I can answer them precisely.
1. Authoritative tag categories
Please use the following document as the authoritative reference for the relevant abbreviation/tag classifications:
D:\Lanxin\Desktop\ONCOJ Abbr List.docx (ignore hyperlink in this document, it's the content in ONCOJ website)
This document has previously been designated as the reference for abbreviations. See also:
D:/Lanxin/Desktop/COJ/treditor/tag_names.json
The fact that the current Python constant LEXICAL_TAGS contains PFX, SFX, and CL should therefore not be taken as authoritative evidence for the lexical-item/grammatical-item distinction being defined here. The existing variable name may reflect a different or older use of the term "lexical."
Please inspect the reference document and use its Parts of speech: Words and Parts of speech: Bound morphemes classifications for the distinction discussed here.

2. Tag classification, tree position, and word-level segmentation
In the BS.1 example, mi is a grammatical item, whereas ato is a lexical item.
The combination miato is itself a new noun and is also a lexical item.
The highest-level units directly attached to a phrase node can be understood as the word-level units of that phrase. Crossing above this level takes us from the internal structure of a word to the structure of a phrase.
For example, suppose an IP-REL directly contains two nodes:
an NP-OB1, whose descendants ultimately represent miato;
a VB-ADC, representing tukuru.
At the word level, this can naturally be segmented as:
miato tukuru
This does not prevent ato, inside miato, from also being a lexical item and from existing independently as a word in other contexts.
An important distinction is therefore required between syntactic decomposition and word segmentation. The syntactic tree may decompose a word into smaller units, including grammatical items that do not normally occur independently, even though those smaller units are not separated by spaces in ordinary word-level segmentation.
For example:
mi ato tukuru
would generally be a less natural word-level segmentation than:
miato tukuru
A representation such as:
mi-ato tukuru
may also be useful when we want to preserve the word-level boundaries while making a smaller internal boundary visible.
For future documentation and UI work, I propose using the following terminology:
a. word-level segmentation
A segmentation in which spaces are inserted only between the immediate children of phrase nodes. Material represented by lower-level descendants within each such word-level unit is recombined rather than separated by spaces.
Example:
miato tukuru
b. hyphenated word-level segmentation
A variant of word-level segmentation in which the same word boundaries are preserved, but selected boundaries between smaller units inside a word may additionally be represented with hyphens.
Example:
mi-ato tukuru
c. morpheme-level segmentation
Example:
mi ato tukuru
This terminology and distinction should be documented explicitly, because different segmentation schemes will be important in future UI development.
It also helps explain why the segmentation shown in a corpus header does not necessarily correspond to the segmentation obtained by simply concatenating all terminal or lower-level nodes of the syntactic tree with spaces. The header is segmented by words, whereas the syntactic tree may further decompose those words into smaller units such as grammatical items.

3. What counts as a word / relevant tag category
MK is a word.
For the broader question of which tags belong to which categories, consult:
D:\Lanxin\Desktop\ONCOJ Abbr List.docx (ignore hyperlink in this document, it's the content in ONCOJ website)
You also asked:
Should a Words-tagged node containing children itself count as a lexical item?
I am not yet certain what structural situation you intend this question to cover. Please give me a concrete tree example.
If you mean a configuration such as the outer N representing miato, which itself has children corresponding to mi and ato, please say so explicitly. In that particular example, miato is a lexical item even though it has internal structure, and ato is also a lexical item.
However, I do not want to generalize from this example to every possible Words-tagged non-terminal node until I understand the cases you have in mind.

4. “Combination” and “new lexical item”
I do not yet understand the distinction you are asking me to make here. Please provide one or more concrete tree examples illustrating:
a case where components are grouped beneath a word-level parent;
a case where items are merely adjacent within a phrase; and
if relevant, a tree configuration that you think might automatically imply the creation of a new lexical item.
Both manual/editorial judgment and automatic machine judgment will eventually be relevant to the tool.
At present, however, we should not invent automatic rules merely because future automation is planned. When a structure later needs to be recognized automatically, the author can add an explicit rule for it.

5. PFX, SFX, and CL exceptions
For now, whether a combination involving PFX, SFX, or CL constitutes a new lexical item is determined by editorial judgment.
There is currently no need to formalize an automatic decision procedure for these cases.
In the future, it may be useful to develop a tool that automatically searches for or identifies candidate cases requiring this kind of editorial decision. That is a future feature and should not be implemented as part of the present task.

6. Lemma-ID consequences
Yes. As a general pattern, when a combination warrants its own dictionary entry:
the parent receives the lemma ID for the complete combination; and
the children retain their own lemma IDs where applicable.
The titi + papa structure you identified, in which the parent has L050402 while the components retain separate IDs, is an example of this general pattern.
Also, an existing lemma ID on a parent establishes dictionary-entry status, but it does not by itself establish lexical-item status.
This distinction is important:
having a lemma ID / dictionary-entry status must not be used as a test for whether something is a lexical item.
Lemma-ID assignment and lexical/grammatical classification are separate dimensions.

7. Scope and documentation destination
For now, do not attempt to formalize cases involving:
grammatical item + grammatical item combinations; or
expressions spanning phrase nodes;
unless the existing rules already clearly determine the answer.
If such cases become relevant and the correct treatment is not specified, ask the author rather than extrapolating a new rule.
For the present task, do not modify any corpus annotations or application code.
The goal is only to create a dedicated documentation resource recording these rules so that the author can quickly retrieve, cite, and extend them in the future.
If there is already an appropriate documentation file in the repository whose purpose clearly encompasses these annotation principles, you may propose adding the rules there instead of creating a new document. Otherwise, propose a dedicated guidelines document.

8. Consistency audit of the existing repository
In addition to formalizing these rules, inspect the existing repository for any code, documentation, configuration, terminology, or existing assumptions that may conflict with, misrepresent, or need to be updated in light of these rules.
This should include, where relevant:
constants or category lists such as LEXICAL_TAGS;
tag definitions and mappings;
existing documentation;
segmentation logic;
lemma-ID handling;
lexical-item or grammatical-item detection logic;
UI code that assumes a particular segmentation or word boundary;
comments, variable names, or terminology that may encode an older or different definition;
tests whose expected behavior may conflict with the clarified rules.
For every potential conflict you find, report:
the relevant file and location;
the current behavior, definition, or assumption;
which clarified rule it may conflict with;
whether it is a definite conflict, a possible conflict requiring clarification, or merely potentially misleading terminology;
what kind of change would likely be needed; and
whether changing it could have downstream consequences elsewhere in the repository.
Do not modify any of these files yet.
At this stage, I want an audit and a proposed change list only. This applies even when a conflict appears obvious or the required fix seems trivial.
Do not update code, documentation, configuration, tests, corpus annotations, or other repository files to resolve these conflicts until I have reviewed the findings and explicitly approved the relevant changes.

Next step
Before making any modifications:
inspect D:\Lanxin\Desktop\ONCOJ Abbr List.docx and the relevant tag_names.json;
reconcile the terminology with the authoritative tag categories found there;
give me concrete examples for the unresolved questions in sections 3 and 4;
identify any additional ambiguities and ask me about them;
perform the repository consistency audit described above; and
report your findings and proposed changes to me for review.
Do not modify any files until I explicitly approve the proposed changes.

#### After commit e15ad38 (3)
1. Word-tagged parents with phrase children
In KK.30, the outer VB-ADN can be regarded as a word.
In an idealized hierarchy, we might expect something like:
morpheme → word → phrase → clause
but actual syntactic annotation does not always conform perfectly to such cleanly separated levels. A word-level structure may, in some cases, dominate phrase-level structure.
However, this linguistic/editorial judgment should be kept separate from the procedure used to generate word-level segmentation.
At the current stage, the program does not need to determine mechanically whether a structure such as the outer VB-ADN in KK.30 is genuinely a word, while a superficially similar higher node elsewhere is merely present because of an annotation convention. A reader/editor can make that judgment when it matters.

2. Outer N in MYS.2.150
The outer N in MYS.2.150 should instead be understood as an annotation convention.
In this corpus, every phrase is required to have a head. For example, an NP must have an N as its head. As a result, Words-category nodes can occur at relatively high structural levels in order to maintain a uniform headed syntactic topology.
This uniformity is useful for syntactic-tree search and retrieval. Therefore, the fact that a high-level node has a tag such as N does not necessarily mean that everything dominated by it constitutes one word.
The distinction between KK.30 and MYS.2.150 is therefore meaningful at the level of linguistic/editorial interpretation:
the outer VB-ADN in KK.30 can be regarded as a word;
the outer N in MYS.2.150 is a consequence of an annotation convention.
For now, however, the program does not need to distinguish these two situations automatically. Do not invent a mechanical classification rule for them.

Word-level segmentation
The operational rule for word-level segmentation is simpler and independent of the distinction above:
Starting from smaller units, merge upward. Once a phrase boundary is encountered, stop merging across that boundary.
In other words, phrase boundaries determine where the upward merging process used for word-level segmentation stops.
Under this rule, KK.30 is segmented as:
awokakiyama gomoreru
This does not contradict the editorial judgment that the higher VB-ADN may itself be regarded as a word. Word status as an editorial/linguistic judgment and the operational output of word-level segmentation are not required to coincide in every exceptional syntactic configuration.
Likewise, the higher structural N in MYS.2.150 does not cause material across its internal phrase boundaries to be concatenated.
For the relevant portion discussed above, word-level segmentation therefore yields:
sakariwite asa nageku kimi

Hyphenated word-level segmentation
Hyphenated word-level segmentation is based on exactly the same word-level segmentation procedure.
The word boundaries remain unchanged, but morpheme boundaries inside those word-level units are additionally represented with hyphens.
For example:
word-level segmentation: miato tukuru
hyphenated word-level segmentation: mi-ato tukuru
Thus, the current implementation principle should remain simple:
merge upward from smaller units → stop at phrase boundaries.
Do not add an automatic procedure for deciding whether exceptional higher structures such as those in KK.30 and MYS.2.150 are “really” words. That remains an editorial judgment unless a future rule explicitly requires the program to make that distinction.

3. Nested phrase traversal and word-level segmentation
Yes. At the current stage, the operational rule I want for word-level segmentation is:
Start from smaller units and merge upward. Once a phrase boundary is reached, stop merging across that boundary.
For example:
NP-OB1
└── N
    ├── PFX-HON    mi
    └── N          ato
mi and ato are recombined as miato. The upward merging then reaches the NP-OB1 phrase boundary and stops.
Thus:
mi + ato → miato
This operational segmentation rule should remain separate from the editorial question of whether a particular higher syntactic node can itself be regarded as a word. As discussed in Questions 1–2, the program does not currently need to determine mechanically whether exceptional higher structures are linguistically “words.”

4. Tree-terminal segmentation
Please use the term tree-terminal segmentation, rather than morpheme-level segmentation.
By tree-terminal segmentation, I mean segmentation according to the smallest units that are actually represented as terminals in the existing tree. It does not mean that the program should perform a new or complete morphological analysis.
Therefore, if the tree contains:
VB-CND saraba
as a single terminal and does not further decompose saraba, tree-terminal segmentation should preserve:
saraba
The program does not currently need to infer additional morphological boundaries or split such forms automatically.
However, this gives us a useful future requirement: the system should eventually be able to search for and locate terminal forms that have not been further morphologically analyzed, so that the author can inspect them or perform other requested operations on them.
Do not implement that feature now; record it as a future tooling requirement.
We therefore currently have three useful segmentation concepts:
tree-terminal segmentation: expose the segmentation represented by the terminal nodes of the existing tree;
word-level segmentation: merge upward from smaller units and stop at phrase boundaries;
hyphenated word-level segmentation: use the same word boundaries as word-level segmentation, while additionally representing internal morpheme boundaries with hyphens where such boundaries are represented in the annotation.

5. Historical compound automation / NP_EXPANSION
NP_EXPANSION and the existing compound-processing code should not be treated as linguistic or annotation rules.
I originally created this processor as a tool to help identify compounds. It is still quite incomplete, and I already plan to redesign it.
Therefore:
do not infer annotation policy from its current heuristics;
do not use its behavior as evidence that adjacent noun children automatically form a new lexical item;
do not treat its automatic structural grouping or dictionary-entry creation as authoritative;
and do not modify it as part of the present task.
This is an existing experimental/incomplete compound-finding mechanism whose current behavior should not be interpreted as part of the linguistic specification.

6. Tags absent from the authoritative reference
Please identify all tags currently used or defined in the repository/corpus that are absent from the authoritative abbreviation reference, not only NUMCL, C-N, and C-NP.
Give me a complete list so that I can ask the chief editor what these tags mean and then add the confirmed information to the current abbreviation table.
Before I consult the chief editor, you may also investigate these unlisted tags in the repository and corpus.
For each unlisted tag, where possible, please provide:
the tag itself;
where it occurs or is defined;
one or more representative corpus examples, preferably with text/sentence identifiers;
its apparent structural function based on those examples;
any explanation found in existing code, documentation, comments, tests, or historical material;
and your tentative interpretation, clearly marked as an inference rather than an authoritative definition.
Do not assign any of these tags to the Words or Bound morphemes categories merely by inference.
Their authoritative classification should remain unresolved until it is confirmed by the chief editor and added to the reference table. 
Do not modify the reference table or any other files yet. First report the complete list and your investigation results to me.

#### After commit e15ad38 (4)
One clarification before you proceed:
The statement “Word status is an editorial judgment” is too broad.
More precisely, the program should not determine whether a higher-level structure constitutes a word solely from its Words-category tag or its syntactic-tree topology. For exceptional higher-level structures such as those in KK.30 and MYS.2.150, this distinction should currently remain a matter of editorial judgment.
This does not mean that word status at all structural levels is generally uncertain or requires editorial judgment. Lower-level cases are comparatively well-defined by the existing annotation rules and categories.
Please preserve this narrower distinction in the eventual documentation.
You can now proceed with the complete inventory and investigation of unlisted tags as described. For now, only report your findings. Do not modify any files, and do not start the unrelated TBD tasks.

#### After commit e15ad38 (5)
Based on the tag investigation you have just completed, please now organize the results into **two Markdown reports under `COJ/docs/`**.

You may create and modify **only these two new report files** for this task. Do not modify any existing code, corpus data, tests, configuration, reference tables, or other documentation.

1. Detailed report for the author

Create:
`docs/tag-investigation-report.md`
This should be the comprehensive version for my own review.
Preserve the distinctions from your investigation rather than treating every unlisted string as a genuine linguistic tag. Include the relevant categories you identified, such as:
- substantive unlisted or unclear annotation tags;
- writing-mode strings;
- likely spelling/typing variants or suspicious labels;
- XML/serialization artifacts;
- lemma-like or free-text fields represented as XML elements;
- definitions without current corpus occurrences;
- documented abbreviations used in undocumented contexts or combinations.
For substantive or genuinely uncertain items, preserve useful evidence such as occurrence counts, representative text/sentence IDs, corpus examples, relevant tree context, repository definitions, existing explanations, and tentative interpretations.
Clearly distinguish:
- corpus evidence;
- existing implementation/documentation descriptions;
- tentative interpretations;
- unresolved questions;
- likely technical/data issues.
Do not silently normalize suspicious labels, and do not assign authoritative meanings or classifications by inference.
The report should be detailed enough to serve as a durable investigation record and to support later corpus, parser, documentation, and annotation work.

2. Concise report for the chief editor
Create:
`docs/tag-questions-for-chief-editor.md`
This should be a much shorter document that I can send to the chief editor.
Its purpose is to obtain authoritative definitions and classifications for genuine or plausible annotation categories that are absent from or insufficiently explained by the current abbreviation reference.
Prioritize the substantive unresolved tags from your investigation. Group related tags where appropriate, especially tag families such as the `C-` series.
For each question, include only enough context for the chief editor to recognize the annotation: for example, a representative text ID and a short tree or surface example when useful.
Ask specifically for information such as:
- the full meaning or expansion of the abbreviation;
- its linguistic/annotation function;
- its relationship to similar existing tags;
- where it belongs in the abbreviation reference;
- whether it belongs to **Parts of speech: Words**, **Parts of speech: Bound morphemes**, or another category, where applicable.
Do not burden this report with obvious XML/parser artifacts or implementation details. Suspected spelling variants or unusual annotation combinations should only be included if editorial confirmation is genuinely useful, and should be placed in a short secondary section.

Constraints
Existing descriptions in code such as `tags.py` are evidence, not authoritative linguistic definitions.
Do not modify the authoritative abbreviation reference yet.
Do not resolve uncertain classifications yourself.
Do not make any of the code/documentation/corpus changes identified in the earlier consistency audit.
After creating the two files, **do not paste their contents into chat**. Just tell me:
1. which files you created;
2. a very brief description of each; and
3. whether you encountered any issue that requires my decision.

#### After commit e15ad38 (6)
Please now create a guideline document based on the annotation principles and clarifications I have already provided throughout this task.
Create:
`docs/annotation-guidelines.md`
This document will serve as the aworking guideline for future annotation-related development. In particular, the next development task will apply the confirmed **word-level segmentation** rules to parts of the syntactic-tree UI, so the segmentation section must be precise enough to serve as the specification for that implementation.

Source of authority
Base the guideline on:
1. the rules and clarifications I have explicitly provided in our conversation;
2. the authoritative abbreviation reference we already identified; and
3. confirmed corpus examples we have discussed.
Do **not** treat existing application code, historical processors, variable names, tests, or inferred corpus behavior as authoritative linguistic rules unless I have explicitly confirmed them.
Existing implementation may be cited as context where useful, but it must not silently determine the guideline.

Handling uncertainty
Do not invent or infer missing rules.
If a point is still uncertain, unresolved, awaiting chief-editor confirmation, or has not yet been explicitly decided by me, leave it clearly marked as:
`TBD — requires author/editorial confirmation`
where appropriate.
It is acceptable for the first version of this guideline to contain unresolved sections or incomplete classifications. I will review the document and provide the missing decisions later.
Do not attempt to make the guideline appear complete by filling gaps from your own interpretation.

Writing style
Write this as a **reference guideline**, not as a narrative account of our conversation.
Prefer:
- explicit definitions;
- short rules;
- clearly labeled examples;
- distinctions between concepts;
- implementation-relevant invariants;
- `TBD` markers for unresolved issues.
Avoid recounting the history of how we reached each decision.
Because this document will be consulted during future development, make individual rules easy to locate and cite.

Scope of changes
For this task, you may create or modify:
`docs/annotation-guidelines.md`
Do not modify the UI, segmentation implementation, corpus annotations, tests, processors, tag definitions, or other existing files yet.
The **next task**, after I review and confirm this guideline, will be to inspect the current syntactic-tree UI and determine how the confirmed word-level segmentation rule should be applied there.
After creating the guideline, give me only a brief summary of what was written and a list of any `TBD` items that require my attention. Do not paste the full guideline into chat.

### After commit 4674d2d
I have manually edited docs/annotation-guidelines.md and removed some redundant or overly explanatory material. Please preserve my edits and do not restore deleted wording merely because it appeared in an earlier version or in our conversation history.
I also want to refine the word-level segmentation rule.
The intended general principle is now:
For word-level segmentation, start from smaller represented units and merge upward. Stop merging at any phrase-level or higher constituent boundary.
Please revise the guideline consistently to reflect this formulation.
In particular:
1. Replace formulations that say only “stop at a phrase boundary” where they are intended to express this general rule.
2. Make clear that phrase-level or higher includes higher syntactic levels such as clauses. The rule should not require a separate special case for clause boundaries.
3. Keep the distinction between the general structural rule and the classification of individual tags:
   - the general rule is confirmed;
   - NP, PP, IP, and CP, including their documented subtypes, are confirmed stopping boundaries. CONJP is also a stopping boundary because the authoritative reference explicitly identifies it as a coordinated phrase. multi-sentence is transparently a sentence-level grouping and is therefore also a stopping boundary. If multi-clause is already established as a clause-level grouping, it should likewise be treated as a stopping boundary;
   - for undocumented or unresolved structural labels, the remaining question is whether they are phrase-level or higher—not whether phrase-level-or-higher boundaries should stop merging.
4. Review SEG-03, SEG-04, TBD-01, and any other affected passages for consistency. Revise TBD-01 accordingly. Do not leave labels in TBD-01 merely because they were previously grouped there. Remove cases whose structural level is already clear, such as CONJP and multi-sentence (and multi-clause if its clause-level status is already established). TBD-01 should retain only labels whose structural level is genuinely unresolved, such as the C- and APP- families and other labels for which it is not yet established whether they are phrase-level or higher.
5. Preserve the confirmed examples and expected outputs.
6. Do not introduce a new automatic rule for determining whether an exceptional higher Words-tagged structure is linguistically a word. That remains separate from the operational segmentation rule.
Please make only the necessary edits to docs/annotation-guidelines.md. Do not modify code, tests, corpus data, or other documentation.
Afterward, give me a very brief summary of the passages you changed. Do not paste the full guideline into chat.

### After commit bfe2189
Please revise the **preferred reading / resolved result** workflow.

- Preferred-reading selection should be **off by default**. Normal Text Compare should remain non-interactive.
- Add a button next to **Compare** to enter a selection/resolution mode.
- Only after the user activates this mode should they be able to click differences to choose the preferred reading.
- The bottom **Resolved Result** section should only appear in this mode, and **Copy Result** should only be available there.
- Selecting differences one by one is too slow. Please support faster selection of multiple differences, for example by clicking and dragging across a range or another simple multi-selection interaction.
- If `∅` represents content that exists on one side but is absent on the other—for example `warapagam∅i` vs. `warapagamwi`—the `∅` marker itself should also receive difference highlighting. It should not be visually easy to miss.

Please keep the interaction lightweight: normal comparison first, and resolution/merged-output functionality only when explicitly activated by the user.

### After commit 5558e2a
I have received the Editor-in-Chief's response regarding the tag issue.
The answer is in "D:\Lanxin\Downloads\tag-questions-for-chief-editor + BF.docx" (the question document is "D:\Lanxin\Downloads\tag-questions-for-chief-editor.docx").
Chief Editor also replies:
"There are several issues with the EN and SM mark-up, including tags. NPs can also have a NP head. If you can find more phrase tags beneath word tags, that would be great. There are probably many in EN and SM, but again, we will return to those files later. It is very helpful that you can identify inconsistencies in tags and other mark-up, thank you."
Please: 
1. Update the annotation guideline based on this response; note that the Editor-in-Chief has modified the previously discussed KK.30 and MYS.2.150 entries.
2. Search for and correct additional anomalous data as explained and requested by the Editor-in-Chief. You can output the detailed search results and corrections regarding the raw data to COJ/reports.

Please do not record items if they are currently uncertain or subject to further discussion. If you are unsure about anything, please ask me. Keep the content of the guidelines concise and consistent; there is no need to include useless examples of errors—such as those that serve merely as historical data rather than helping to explain the guidelines.

### After commit 88f3e30
Please update and prune `docs/annotation-guidelines.md` based on the **confirmed** findings in `reports/annotation-audit-5558e2a.md`.
I also confirm that the intended word-level segmentation for the revised KK.30 structure is:
`awokakiyamagomoreru`
Treat this as an author-confirmed acceptance case.
Apply the confirmed guideline updates concerning NP heads, KK.30, MYS.2.150, `multi-clause`, `NP-APP`, `WH-ADV`, `NLOG`, `FRM`, and the deferred EN/SM legacy markup.
At the same time, simplify the guideline. It should describe the **current rules**, not the history of how we reached them. Remove material that is:
- obsolete or superseded;
- based on outdated tree structures;
- redundant with a clearer rule elsewhere;
- investigative/audit history rather than a rule;
- an unnecessary example or implementation-specific warning;
- or a `TBD` that has now been resolved.
Do not preserve obsolete information merely as historical notes; the audit report already serves that purpose.
Do not turn tentative or medium-confidence audit proposals into established rules.
The result should be a concise current specification that a future developer can use without needing the investigation history.

### After commit 5a86357
Please change the transcription display in the COJ UI text box to word-level segmentation in Document Section. For the text displayed after the syntax tree is collapsed, users should be able to choose between three segmentation options, with word-level segmentation set as the default.
On the search results page, users should also be able to select different segmentation methods; word-level segmentation is the default. Note that this is a display-related setting rather than an advanced search option. Place it after "Sentence numbers" and avoid cluttering the interface—for example, by displaying the options only when the user selects the checkbox to change segmentation methods.
Do not modify the source data files.
If anything is unclear, please ask me rather than making assumptions.

#### After commit 5a86357 (2)
1. **Hyphens:** Yes. The intended hyphenated word-level output in a case such as KK.30 is `awo-kaki-yama-gomor-eru`.

   If by “keeping multipart writing-mode components joined” you mean that multiple form parts belonging to the same terminal are separated only because of writing-mode annotation (e.g. LOG/PHON), then yes: keep those parts joined. A writing-mode boundary alone should not introduce a hyphen.

2. **Words spanning rows:** Whether merging across rows is allowed depends on whether the display needs to preserve alignment with row-level/source-level data.

   **Do not merge across rows** in displays where each displayed segment must correspond to a particular source row, sentence, or associated metadata. This includes:
   - text boxes whose text corresponds to individual rows;
   - other displays requiring row-by-row or sentence-by-sentence correspondence;
   - search results when sentence/text numbers are displayed and must remain aligned with their corresponding content.

   However, **cross-row merging is allowed when that correspondence is not required**. In particular, when collapsing the syntactic tree, if a collapsed constituent spans multiple source rows, its material may be merged according to the segmentation rule.

   So the general UI principle is:

   **Preserve row boundaries when they are needed to maintain alignment between displayed text and row-/sentence-level data; otherwise, segmentation may merge across those boundaries.**

   The underlying source rows and annotations should not be modified merely because the display merges their material.

3. **Unresolved annotations:** Yes. For unclassified EN/SM annotations, NULL/ILL material, and other unresolved cases, retain the existing display behavior rather than inferring new segmentation rules.

Please apply these as display rules only. Do not modify corpus annotations as part of this UI task.

### After commit ac9b3fa
Good work. Currently, glosses and script tags disappear after collapsing syntax tree constituents; please try to fix this issue. Do not alter or break any existing functionality. If you are unsure about anything, ask me—do not make changes based on assumptions.

### After commit 227e971
1. One correction: the Editor-in-Chief has now confirmed that **`multi-clause` should be `multi-sentence`**.
The latest source data containing this correction will be synchronized later. Please treat `multi-sentence` as the authoritative label from now on and update any outdated documentation, guidelines, assumptions, or current UI work that still treats `multi-clause` as unresolved or potentially valid.
Do not modify the corpus data itself; the corrected source data will be synchronized separately.

### After commit b47e48c
1. Please compile and condense the relevant contextual information from this chat into a single document so that I can take it to a new chat. Put this document in "D:\Lanxin\Desktop\COJ-backup\Context".

### After commit 0679d7d
Please re-evaluate the structured syntax-tree editing design based on the CURRENT repository.
The repository and corpus handling have changed since the previous design analysis. Treat the old analysis as historical context only. Inspect the current parser, data model, TXT/XML conversion, Workbench, dictionary integration, source markers, multipart words, tests, and real corpus examples before proposing a design.
Do not implement anything yet.
The main goal is a low-friction authoring workflow for linguists. The current legacy TXT format repeats full tree paths and mixes syntax with lexical and textual metadata, making structural editing cumbersome.
Please reconsider whether we should use:
1. the existing structured Workbench editor;
2. a new UTF-8 plain-text authoring format/DSL (possibly `.syn`);
3. or a combination of both.
A possible architecture is:

    human authoring source
            ↓
    canonical data model
       ↙     ↓      ↘
     TXT    XML    tree viewer

Do not assume this architecture is correct; evaluate it.
Important corpus constraints:
- surface form and lexicon ID are not uniquely mapped;
- syntax structure, transcription/tokenization, original kanji segmentation, and header/text segmentation are distinct layers;
- their boundaries do not always coincide;
- a transcription word may cross a kanji/source-text segment boundary;
- source markers, comments, multipart words, distinction labels (`;@N`), lexical annotations, and document IDs must not be silently lost.
If proposing a new authoring format, it should minimize repetitive manual input and work well in VS Code with future autocomplete, dictionary lookup, diagnostics, folding, tree preview, and TXT/XML export.
Please produce a concise new design document covering:
- the current architecture and what has changed since the previous analysis;
- the independent data/annotation layers;
- the recommended canonical model;
- how mismatched segmentation and stable identities should work;
- whether a `.syn`-like authoring format is worthwhile;
- 2–3 short syntax examples if it is;
- semantic round-trip risks for TXT/XML;
- how structured editing, synchronization, validation, and undo should work;
- a staged implementation recommendation.
Use actual repository/corpus evidence where possible. If the semantics of something are unclear, mark it unresolved instead of inventing an interpretation.
Do not implement the editor or modify the graphical tree renderer yet.

#### After commit 0679d7d (2)
Continue from the current `syntax-tree-authoring-design.md`.
I prefer the authoring syntax to minimize punctuation and redundant field names. For normal lexical terminals, I strongly prefer something like:
    N titi L050641 PHON
over:
    N "titi" lemma=L050641 script=PHON
The format should optimize for frequent human editing. Use positional fields where their meaning is reliably determined by context, and reserve explicit syntax/field names for exceptional or ambiguous cases.
Stable internal IDs may be necessary, but they should create as little visual and typing burden as possible. Consider whether tools can generate, maintain, or visually hide/dim them rather than requiring the linguist to type them routinely.
Please now create a small `.syn` authoring-format prototype comparison. Do not modify the existing corpus or implement the full editor yet.
Using real examples already identified in the repository, including:
- an ordinary syntax tree;
- KK.30 cross-source-segment word grouping;
- MYS.4.619 multipart `ipa + ku → ipaku`;
- MYS.2.150 / repeated structures and `;@N`;
propose 2 alternative compact `.syn` syntaxes.
For each, show complete enough examples to judge what everyday editing would actually feel like.
Prioritize:
- minimal punctuation;
- minimal repeated metadata;
- easy indentation-based subtree editing;
- readable Git diffs;
- dictionary IDs that remain explicit when selected;
- correct preservation of script type;
- source/transcription segmentation independent of syntax;
- multipart terminals;
- stable identity where genuinely required.
Then recommend one syntax for a small parser/serializer pilot.
Do not implement the VS Code extension yet. The purpose of this step is to settle the human-facing authoring syntax before building tooling.

### After commit ab78d4e
Continue from `syn-prototype-comparison.md`, but do not assume A or B is the final design. I want to revise the model based on the actual annotation workflow before implementing anything.
The normal workflow is:
1. enter the original kanji text sentence/segment by sentence;
2. segment it into lexical components;
3. assign each component its lemma ID and script type;
4. construct the syntax tree afterward.
A preferred human-facing form is roughly:
    source
      1 | 多迦由久夜
        | taka L007005 PHON
        | yuku L031840a PHON
        | ya   L000537 PHON
    tree
      IP-MAT
        | ...
          | ADJ-STM taka
          | VB-ADC yuku
Whitespace indentation should encode hierarchy. `|` should only be an automatically maintained visual guide.
Do not require annotators to type IDs such as `#t1` or `1.1`. Components may have hidden hierarchical addresses (`1.1`, `1.2`, `1.1.1`, etc.) and persistent internal identities, but the normal authoring view should show forms such as `taka`. Repeated forms can later be disambiguated through tooling.
Also model **lexical composition separately from syntax**. For example:
    takayuku L030996a
      ├─ taka L007005
      └─ yuku L031840a
The compound structure may align with a syntax node, but should not depend on it. Higher compound lemma IDs may optionally be displayed on the syntax tree, but that is a presentation choice.
The program should eventually be able to infer likely compound lemmas from component lemma structures and fill them automatically for later review. Not every compound has or needs a lemma ID; absence of one is valid, and dictionary entries should only be created when the user chooses.
Design lexical composition recursively so it can support future finer morphological analysis. Compound occurrences may eventually use a separate identity namespace such as `C...`, but do not commit to that syntax yet.
This should also support collecting attested forms under existing dictionary lemma IDs without creating new lemma IDs.
Avoid manually authored legacy bookkeeping where possible. In particular, TXT marker paths/preservation data should be reconstructed algorithmically from the semantic model whenever deterministically possible; only genuinely non-derivable information should require preservation.
The model must remain compatible with source segmentation, multipart forms, headers, script types, `;@N`, TXT/XML conversion, and future annotation types.
Please revise the `.syn` design accordingly and show 1–2 concise real-corpus examples. Focus on the distinction between:
- source/text segmentation;
- lexical components;
- recursive lexical/compound structure;
- syntax structure;
- hidden identity;
- display choices.
Keep human-facing input as minimal as possible.
Do not implement anything yet.

#### After commit ab78d4e (2)
Please revise the current authoring design around the following workflow. Keep source, lexical occurrences, lexical composition, syntax, and display separate in the semantic model, but do not make every layer a manually edited section.
1. Source entry
The user should manually enter only source-text segmentation and transcription components:

    source
      1 多迦由久夜
        taka
        yuku
        ya
Each component creates a persistent lexical occurrence.
2. Lexical annotation and tree editing
Those same occurrences should be inserted directly into the tree editor; the user should not retype the terminals.
The `taka` in `source` and `ADJ-STM taka` in the tree must be **the same underlying occurrence**, not two strings matched by spelling. Repeated identical forms must remain distinguishable through hidden persistent identity.
The editing view may show:
    ADJ-STM taka L007005 PHON
    VB-ADC  yuku L031840a PHON
    P-FOC   ya   L000537 PHON
but semantically:
- form/lemma/script belong to the lexical occurrence;
- category and hierarchy belong to syntax.
Editing lexical information through either view updates the same occurrence.
3. Reduce manual annotation
Use existing dictionary/corpus evidence to assist input:
- search/autocomplete lemma IDs;
- suggest/rank terminal categories from previous attestations of the same form/lemma and relevant morphological patterns;
- autocomplete the small controlled set of script tags;
- support batch assignment of common tags such as PHON/LOG, with unusual cases edited individually.
The program should pre-fill what can be safely inferred so the user mainly reviews and corrects exceptions.
4. Tree construction
The main manual task should be arranging existing terminals into the syntactic hierarchy and adding branches.
Whitespace encodes hierarchy. `|` may be an automatically generated visual depth guide.
5. Lexical composition
Keep recursive lexical composition as a separate semantic structure, but do not require users to manually maintain a visible `composition` section.
Where possible, derive compound structure and existing compound lemma associations from component lemma structure and dictionary evidence. These can be reviewed separately or optionally displayed on the syntax tree.
A compound may legitimately have no lemma ID. Do not require confirmation or creation of a dictionary entry.
The model should remain extensible to finer future morphological analysis and collection of attested forms under existing lemma IDs.
6. Display and persistence
Lemma IDs, glosses, script tags, compound lemmas, etc. should be independently showable/hideable without changing the underlying data.
Technical occurrence IDs, alignment data, and reconstructible legacy marker bookkeeping should normally remain hidden and tool-maintained. Moving syntax must not change lexical occurrence identity.
Please make the shared-occurrence relationship explicit in both the semantic model and persistence/encoding design.
Update the design and show one concise KK.67 example of the actual user workflow. Do not implement anything yet.

#### After commit ab78d4e (3)
Please revise the design of the **tree-building interaction**. Keep the current semantic model and source-first workflow; the main issue is that users should not have to build trees by manually maintaining indentation.
The serialized tree may still use whitespace indentation, but **storage syntax and editing interaction should be separate**.
After source entry and assisted lexical annotation, the editor may start with terminals such as:
    ADJ-STM taka L007005 PHON
    VB-ADC  yuku L031840a PHON
    P-FOC   ya   L000537 PHON
These are the existing lexical occurrences from the source view, not retyped copies.
The primary tree-building operation should be something like **Wrap in Parent**:
1. select one or more adjacent terminals/subtrees;
2. invoke a lightweight command/shortcut;
3. type or autocomplete the parent category;
4. the editor creates the parent and handles indentation automatically.
For example:
    ADJ-STM taka
    VB-ADC yuku
→ Wrap in `VB-ADC` →
    VB-ADC
      ADJ-STM taka
      VB-ADC yuku
Then selecting that subtree together with `P-FOC ya` and wrapping in `MK` produces:
    MK
      VB-ADC
        ADJ-STM taka
        VB-ADC yuku
      P-FOC ya
Category entry should support autocomplete and ideally rank likely categories using existing corpus structures. Tab/Shift+Tab, Enter, cut/paste and subtree movement can remain useful secondary operations for adjustment.
The user should not need to manually add indentation or `|` guides when building normal trees. `|` remains generated visual guidance only.
Please update the design with a concise KK.67 interaction example and clearly distinguish:
- serialized tree representation;
- visible tree/editor representation;
- structural editing operations.
Do not implement anything yet.

#### After commit ab78d4e (4)
Please inspect the current application and propose an implementation plan for the authoring workflow we have now designed.
I am comfortable making the existing editor app the primary authoring interface. Users should normally work through the structured UI rather than manually editing raw `.syn` text.
The saved authoring data should still be human-readable, deterministic, Git-friendly text so that Git diff/history remains useful. VS Code can initially serve mainly for file storage, inspection and version control; a full VS Code editing extension is not a priority.
Please inspect the current code and determine:
- which existing Workbench/editor components can be reused;
- which parser/tree/dictionary/TXT/XML/segmentation functionality can be reused;
- what needs to be extended for source entry, shared lexical occurrences, terminal generation, lemma/category suggestions, batch script tagging, and **Wrap in Parent** tree construction;
- what genuinely needs to be built from scratch;
- how the new complete authoring model should fit into the current architecture without duplicating existing functionality;
- how a deterministic Git-friendly `.syn` or equivalent persisted representation should fit into this workflow.
Prefer incremental extension of the existing application over a rewrite.
Give me a concise staged implementation plan and identify major technical risks or architectural blockers.
Do not implement anything yet.

### After commit 22b35b4
Proceed with the first implementation milestone inside the existing `treditor` application.
Do **not** create a separate app and do not rewrite the existing editor. Keep the new editing functionality modular so that it does not destabilize existing Syntax Trees, Workbench, Dictionary, or browsing behavior.
For the temporary UI, add **Editing** directly below **Workbench** in the existing navigation. Give it a simple small icon matching the style of the existing navigation items. Do not redesign the overall UI yet.
Implement the first usable prototype covering **Stage 1 + minimal Stage 2** from the current authoring design:
- define the complete authoring model and validation;
- implement deterministic, Git-friendly `.syn.json` load/save;
- keep technical occurrence IDs hidden from the normal UI;
- add source-text segmentation and transcription-component entry;
- creating a component should create one persistent lexical occurrence;
- automatically make those same occurrences available as terminals for later tree construction;
- source and tree views must reference the same occurrence, never duplicate lexical data;
- support partial/incomplete drafts;
- save, close, reopen, and preserve identities and data correctly.
Use the existing `treditor` shell and reuse existing infrastructure where appropriate. Put new authoring model, persistence, commands/state, and Editing UI logic into focused modules rather than continuing to accumulate unrelated logic in `app.js` or `app.py`.
Do **not** implement yet:
- full tree construction / Wrap in Parent;
- advanced lemma/category suggestions;
- composition inference;
- legacy TXT/XML publishing;
- VS Code extension;
- final UI styling/navigation redesign;
- corpus migration.
Do not modify existing corpus data.
The goal is a small prototype I can actually try: open **Editing**, enter source text and transcription components, save them as a complete `.syn.json`, reload them, and verify that the same lexical occurrences and identities survive.
Run relevant existing tests and add focused tests for the new model and save/load behavior. After implementation, give me a concise summary of what was added, how to try it, and any design problems discovered.

### After commit 023a10c
Before adding more Editing features, please improve the usability of the current prototype.
After trying the current UI, it is not clear what I should do first or how the basic workflow is supposed to work. Please adjust the Editing prototype so that, on opening the page, it is immediately obvious how to start and continue editing.
In particular:
- Make **New text** and **Open existing text** clear and easy to understand.
- It should also be obvious how to edit an already opened text and save the changes.
- **Text ID** should be more important than Filename.
- Generate the `.syn.json` filename/path automatically from the Text ID; users normally should not need to manage filenames manually.
- Save/Open/Refresh/upload and other file-management controls should not dominate the first visual layer.
- **Add segment** should be an obvious primary action for an empty text.
- After adding a segment, focus directly on source-text entry.
- Make entering and editing the source text and its transcription components natural and require as little clicking as possible.
- Existing segments and components should be clearly editable, addable, and removable.
- The currently non-functional Tree workspace should not occupy half the page. Hide, collapse, or simplify it until tree editing is actually useful.
- Remove developer-oriented text such as explanations about “shared lexical records” or “categories may remain unresolved”.
A new user should be able to understand this basic workflow from the interface itself:
    New/Open text
        → enter or edit source segments
        → enter or edit transcription components
        → save
        → reopen and continue later
Preserve the current shared-occurrence model and `.syn.json` persistence underneath. This is a usability/workflow improvement, not a data-model redesign.
Keep the existing COJ/treditor visual style. This does not need to be the final polished UI; the immediate goal is simply to make the current prototype intuitive enough to test properly.
Do not add lemma autocomplete, category suggestions, Wrap in Parent, composition inference, or other later-stage features yet.

#### After commit 023a10c (2)
Please pause further implementation and re-evaluate the Editing data model and workflow. Do not change code yet.
The current prototype was based on an incorrect simplification. Please inspect the existing corpus structure and current TXT/XML data before proposing changes.
The important distinctions are:
1. Document and Text are different levels
- A Document is a storage/container unit and may contain many texts.
- A Text is the normal scholarly editing unit, e.g. BS.1 or MYS.4.619.
- Do not assume Text ID = filename or one text = one .syn.json file.
- New texts must eventually be assigned to an appropriate authoring document/location, separate from existing corpus source files.
2. Text entry has three distinct layers
The normal annotation workflow is:
original/source text:  多迦由久夜
transcription:         takayukuya
lexical components:    taka | yuku | ya
The user first enters the original text and its transcription, then segments/analyses that transcription into lexical components.
The overall transcription is related to the existing header, but source-text boundaries, transcription boundaries and lexical/word boundaries do not always coincide. Cross-boundary words must remain representable.
Do not expose an abstract model term such as Segment as the primary user concept unless the existing corpus workflow genuinely requires it. The UI should reflect what the linguist actually enters and edits.
3. Existing and new texts
Open existing text should mean existing scholarly texts, including texts already in the corpus as well as texts previously created through Editing. It should not mean only saved .syn.json drafts.
Opening an existing legacy corpus text may require importing it into the new authoring model, but this must not modify the original corpus data.
4. Preserve the parts of the previous design that are still valid
- lexical occurrences have persistent hidden identity;
- source/transcription and tree views reference the same occurrences rather than duplicate strings;
- lemma/script annotation belongs to the occurrence;
- syntax is a separate structure;
- lexical composition is separate and normally tool-derived/optional to inspect;
- tree construction will later use structural operations such as Wrap in Parent;
- technical IDs and legacy bookkeeping should not clutter normal editing.
Please inspect the real repository/data and propose:
1. the corrected Document → Text → original text / transcription → lexical components model;
2. how this relates to the existing header and source markers, including mismatched boundaries;
3. how existing corpus texts and newly authored texts should be opened and stored;
4. a simple UI/workflow mockup showing what the linguist actually sees and enters;
5. what needs to change in the prototype already implemented.
Keep the proposal concise and based on actual corpus evidence. Do not implement anything yet.

#### After commit 023a10c (3)
Please pause implementation and revise the Editing design again based on the actual annotation workflow. Do not change code yet.
First inspect the current repository thoroughly: existing corpus data, annotation guidelines, documented data issues/questions, morphology/compound handling, TXT/XML conversion, and relevant tests. Do not invent new annotation rules where existing project evidence already exists.
The intended workflow is:
1. Text structure: a Document contains many scholarly Texts. Existing mappings such as BS.* → BS and MYS.4.* → MYS_04 are established. Eventually the corpus documents should be migrated as complete .syn.json documents; Editing should not use one file per Text.
2. Source entry: within each Text, the user enters numbered source lines/passages starting from 1, for example:
   1 多迦由久夜
     taka yuku ya
   
   The source text must remain visibly associated with its number so numbering/segmentation errors can be noticed.
   Support both line-by-line entry and efficient bulk paste/import. Existing corpus texts and newly created texts should ultimately appear in the same Editing representation.
3. Transcription and initial segmentation: taka yuku ya is both the transcription and its initial space-delimited component segmentation. Do not require the user to enter an additional takayukuya transcription and segment it again.
   These source-line boundaries must not be treated as word boundaries: words may cross them. The Text-level header must be represented consistently with this fact.
4. Further lexical/morphological analysis: the initial space segmentation is not necessarily the final terminal segmentation. Existing annotation rules may require further analysis. For example, an input such as paruyama may need to be analysed into paru + yama; compounds may need their components identified while also retaining/proposing the compound lexical structure and existing compound lemma where supported.
   Writing-mode parts, morphological segmentation, lexical composition, and syntax terminals must remain distinguishable.
5. Assisted annotation: after source/transcription entry, analyse existing corpus annotations and dictionary evidence sufficiently to pre-fill, where well supported:
   - lemma IDs;
   - terminal categories such as ADJ-STM;
   - further segmentation/morphological structure;
   - compound structure/lemma associations.
   The intended interaction is pre-fill → user reviews → user changes exceptions, not repeated confirmation dialogs. Users must also be able to select another candidate or manually enter a new annotation.
   Script tags can initially be assigned manually, preferably with multi-selection/batch PHON/LOG assignment; unusual cases can be edited individually. Future reliable script suggestions may be added later.
6. Syntax construction: analysed terminals are the same underlying occurrences created from the source/transcription analysis, not retyped copies. The user then builds the syntax tree from those terminals using structural operations such as Wrap in Parent.
7. Storage: ultimately, all existing corpus documents should be equivalently migrated to .syn.json as the Editing source of truth. Editing changes are saved there. TXT/XML should be generated only through an explicit reviewed export process. Do not perform that corpus migration yet.
Please revise the model and Editing workflow accordingly, using real repository examples where possible, and identify what is wrong with the current prototype.
Do not implement anything yet. Most importantly, do not guess unresolved corpus semantics or workflow requirements. If the repository evidence and the requirements above are insufficient to determine something, ask me before choosing a design.

#### After commit 023a10c (4)
Please now revise the Editing/authoring design document based on all of the requirements and clarifications we have just established.
In particular, make sure the revised design correctly reflects:
- Document ≠ Text: one document contains many scholarly Texts, following the existing repository’s document/text organization.
- Source lines/passages are numbered from 1, with the original text visibly associated with each number.
- Users enter original text plus spaced transcription such as taka yuku ya; the spaces provide the initial component segmentation.
- Support both line-by-line entry and efficient bulk paste/import. Existing and newly authored Texts should ultimately use the same Editing representation.
- Initial transcription segmentation is not necessarily final lexical/morphological or syntax-terminal segmentation. Existing repository rules and annotations should guide further splitting, morphology and compound analysis.
- Lemma IDs and terminal categories should be pre-filled as far as well-supported corpus/dictionary evidence allows, then reviewed and corrected by the user rather than requiring repeated confirmation.
- Script tags can initially be assigned manually, including batch PHON/LOG assignment.
- Source/transcription occurrences and syntax terminals must remain linked through shared underlying identity rather than duplicated strings.
- Lexical composition remains separate from syntax and may be inferred/reviewed without requiring every compound to have a lemma.
- Syntax is built afterward from the analysed terminals using structural operations such as Wrap in Parent.
- Header-like word segmentation for new Texts should be derived from underlying annotation using the repository’s documented segmentation rules, not routinely entered as a separate field. Imported historical headers are preserved for compatibility/discrepancy checking.
- Eventually the existing corpus should be migrated by document into complete .syn.json authoring data. Do not perform that migration yet.
- TXT/XML ↔ .syn synchronization/export is explicit and user-controlled. Temporary divergence is allowed. Unresolved representation discrepancies may be saved in .syn but must block reviewed .syn → TXT/XML write-back.
Use the actual repository documentation, annotation rules, existing data and tests to resolve details rather than inventing new corpus semantics.
Update the design document and clearly identify what is wrong or obsolete in the currently implemented Editing prototype and what would need to change next.
Do not implement anything yet. Do not make assumptions where the requirements or repository evidence are insufficient; ask me before deciding.

#### After commit 023a10c (5)
Before implementation, please explain the unresolved split/merge identity problem in practical terms and propose 2–3 possible designs. Do not choose or implement one yet.
Use real corpus-style examples, especially cases like:
entered transcription:
paruyama

analysed structure:
paru + yama

where the initial transcription unit is later analysed into finer lexical/morphological components.
Please explain:
- what identities need to exist before and after the split;
- whether the original paruyama remains a persistent object representing the entered transcription material, while paru and yama become separate analysed occurrences;
- how syntax, lexical composition, source alignment, undo/redo, and later re-merging would behave under each design;
- what happens when existing imported corpus data already contains the finer analysis;
- which approach produces the clearest Git history and least fragile references.
Distinguish entered transcription units, analysed lexical/morphological occurrences, and syntax terminals rather than assuming they are the same object.
Give me 2–3 concrete alternatives with a small diagram/example and the practical advantages/disadvantages of each.
Do not make a design decision for me. If repository semantics needed to compare the options are unclear, ask me rather than assuming them. Do not change any code or documentation yet.

#### After commit 023a10c (6)
The Alternative 1/2 comparison helped clarify the issue, but I think the model should be reconsidered in light of the existing corpus structure.
I do not want finer analysis to replace and discard the higher analysed structure. The analysis itself should be preserved as a recursively refinable annotated hierarchy.
For example:
N L090723
  N paru L051724
  N yama L050034

paru and yama have their own tags and lemma IDs, while the higher paruyama unit also has its own tag and may have lemma L090723. If further supported analysis is added later, it should extend the hierarchy downward rather than erase the existing higher relationship.
This resembles structures already present in the corpus, such as:
N L050402
  N titi L050641
  N papa L051720

The higher form (titipapa, paruyama, etc.) is normally derivable from its children and should not need to be redundantly stored or manually maintained. It may be displayed when useful. At still higher levels (NP, PP, IP, CP, etc.), the structure becomes primarily syntactic and a lexical form is generally not meaningful or necessary.
Therefore, please reconsider whether we need a special W1 whole-analysis container at all. A more natural model may be a single recursively annotated hierarchical tree, where relevant nodes can carry:
- category/tag;
- optional lemma;
- children;
- other lexical/morphological annotations where applicable;
while higher nodes increasingly represent syntactic structure. I do not think we need to impose a fixed boundary where “lexical tree” ends and “syntax tree” begins.
Source/transcription remains a separate entered layer and must be linked/aligned to this analysed tree through persistent identity. Initial transcription segmentation, derived word/header segmentation, and the terminal/analysis hierarchy remain distinct and must not be assumed to coincide.
An important future use is evidence-based reuse: if the corpus repeatedly attests the same lemma with a similar internal tagged structure, that entire analysis pattern should be usable as evidence for pre-filling a new occurrence, while still allowing exceptions.
Please inspect the current XML/corpus model and real examples and evaluate whether this unified recursive annotated-tree model fits the existing data better than Alternatives 1 and 2. Explain any cases it cannot represent cleanly or any identity problems it still leaves unresolved.
Do not implement or change documentation yet. Do not invent missing linguistic semantics. If the repository evidence and the requirements above are insufficient, ask me before deciding.

#### After commit 023a10c (7)
Please update the current authoring/Editing design document to incorporate the clarification we just reached.
The target model should use a single recursively annotated hierarchy, not separate syntax and lexical-composition trees.
For example:
N L090723
  N paru L051724
  N yama L050034

Relevant nodes may carry their own category/tag, optional lemma and other annotations. Higher lexical forms such as paruyama are normally derivable from their children and should not be redundantly authored. Further supported analysis extends the hierarchy downward; higher levels gradually become primarily syntactic (NP, PP, IP, CP, etc.) without requiring a fixed lexical/syntax boundary.
Composition is therefore a view/interpretation of this same hierarchy, not an independently editable grouping. Nested compounds are represented recursively in the hierarchy. We do not currently need competing analyses of the same occurrence.
Source passages and entered transcription remain a separate input layer aligned to the annotated hierarchy. Initial transcription segmentation, derived word/header segmentation, and the annotated hierarchy must remain distinct.
Please revise the existing design consistently, especially any sections that still assume:
- separate composition groups/graphs;
- separate lexical and syntax trees;
- split analysis replacing and discarding higher analysed nodes;
- syntax terminals as duplicated lexical records.
Re-evaluate the current prototype assessment and staged implementation plan accordingly.
Do not implement anything yet. If this clarification creates a conflict with real repository data or leaves an implementation-critical semantic question unresolved, show me the concrete case and ask me rather than choosing a behavior yourself.

#### After commit 023a10c (8)
Please make the following final corrections to the current Editing design. Do not implement anything yet.
1. Remove the terminal-tray concept.
Assisted analysis and tree construction operate on the same recursive annotated hierarchy. After source/transcription entry and analysis, the resulting nodes appear directly in the hierarchy/tree workspace:
ADJ-STM taka
VB-ADC  yuku
P-FOC   ya

These are already the persistent annotated nodes. The user reviews/corrects them, refines them downward where necessary, and builds upward from them. There is no separate step of moving/copying analysed units from an Analysis view or terminal tray into a Tree.
Analysis and Tree may have different display modes, but they edit the same hierarchy.
2. Keep ordinary editing text-like; use structural commands when they save substantial work.
Small/local edits should feel close to normal text editing:
- Enter to create a new line/node where appropriate;
- Tab / Shift+Tab for local indent/outdent or reparenting;
- direct typing/editing of node contents;
- normal selection, cut/copy/paste where structurally valid;
- straightforward child creation for downward refinement.
For example, refining:
N paruyama L090723

downward into:
N paruyama L090723
  N paru L051724
  N yama L050034

should be possible through direct child/text-like editing without unnecessary dialogs.
Wrap in Parent is primarily useful when several existing adjacent nodes/subtrees need to be grouped upward, because manually reindenting all descendants would be inefficient:
ADJ-STM taka
VB-ADC yuku

→ Wrap in VB-ADC →
VB-ADC
  ADJ-STM taka
  VB-ADC yuku

Do not make menu/command-driven structural editing the primary interaction for every small edit. The editor should maintain structural validity and generated indentation/guides underneath these text-like interactions.
3. Keep the tree display lightweight but make lemma information easy to understand.
Lemma IDs, script tags and glosses can be optional overlays. Since an ID such as L007005 is not informative by itself, reuse the existing treditor dictionary infrastructure where possible: hovering should make the lemma/gloss easy to identify, and clicking a lemma should open the existing dictionary popup/entry view.
4. Update the multipart-refinement decision.
Writing-mode segmentation does not itself license morphological analysis. However, if independently supported finer analysis has the same boundaries as existing writing-mode parts, reuse those nodes rather than creating a redundant layer:
VB-NML ipaku L030199a
  TAG1 ipa Lxxxxx LOG
  TAG2 ku  Lyyyyy PHON

The same node may carry form, category, lemma and script annotations. No current corpus case requires representation of crossing writing/morphological boundaries, so do not design hypothetical machinery for that now. If a real case is later found, ask me before extending the model.
Update the design document consistently, including the workflow, UI mockup, editing interaction, open decisions and implementation stages. Remove obsolete references to a terminal tray or unresolved multipart behavior.
Do not implement anything yet. Do not infer additional workflow or linguistic semantics; if anything required remains unclear, ask me before deciding.

#### After commit 023a10c (9)
Proceed with the first implementation milestone: Stage 1 + Stage 2 only from the current syntax-tree-authoring-design.md.
Implement this incrementally inside the existing treditor; do not create a new app or rewrite unrelated existing functionality. Keep the new Editing logic modular and avoid adding more unrelated responsibilities to app.js/app.py.
Stage 1 — Correct the authoring model
Replace the obsolete single-Text prototype model with the current target:
- one .syn.json Document containing multiple ordered Texts;
- Text identity independent of filename/storage identity;
- numbered source passages starting from 1;
- entered spaced transcription and its initial boundaries;
- one persistent recursive annotated-node hierarchy;
- explicit input-to-node/alignment relationships;
- historical/legacy compatibility data where required;
- deterministic, Git-friendly serialization with stable identities, atomic saves and stale-save protection.
Preserve useful infrastructure from the existing prototype, but do not retain the obsolete separate occurrence/syntax/composition model merely for implementation convenience.
Stage 2 — Make the basic Editing workflow genuinely usable
Implement the actual source-entry workflow:
1  多迦由久夜
   taka yuku ya

2  波夜夫佐和気能
   payabusawake no

The source number and original text must remain visibly associated. Spaces in the transcription provide the initial segmentation, but do not imply final terminal or word boundaries.
Support:
- New Text and Open Text within Documents;
- clear Document/Text selection;
- line-by-line source + transcription entry;
- efficient bulk paste/import of paired passages, with parsed numbering/pairing shown for review;
- editing, adding and removing passages;
- clear saved/unsaved state;
- Save and Reopen of complete multi-Text Documents;
- representative existing corpus Texts opened through a legacy adapter into the same Editing representation as newly authored Texts, without modifying the original corpus.
Keep the UI focused on this workflow. Do not expose implementation concepts such as technical IDs or obsolete “Segment”/terminal-tray mechanics as primary user concepts.
Do not implement Stage 3+ yet: no evidence-based lemma/category/subtree pre-fill, advanced morphological analysis, full hierarchy/tree editing, Wrap in Parent, reviewed TXT/XML export, or corpus migration.
Reuse existing treditor infrastructure where appropriate and run/add focused tests for the revised model, multi-Text persistence, source/transcription entry, legacy opening, and save/reopen behavior.
The acceptance goal is that I can open Editing, create or open a Text, naturally enter/revise numbered original text and spaced transcription, save it inside the correct Document, reopen it, and understand the workflow without instructions.
Follow the current design document rather than the obsolete prototype behavior. If implementation requires a semantic/workflow decision that the design or repository does not determine, stop and ask me instead of guessing.
After implementation, give me a concise summary of what changed, how to test the workflow, and any unresolved issues. Do not migrate the corpus.

### After commit 7d5fb6f
Please improve the current Stage 1+2 Editing UI/workflow before proceeding to Stage 3. Keep the implemented data model and persistence behavior unless a change is required by the workflow below.
1. Move document/text actions into the sidebar
Move New Text, Open Text, and New Document into the Editing sidebar as three equal-level actions. They should not dominate the main editing workspace.
Their behavior should be clearly separated:
- New Text: create a Text and let the user choose which existing Document it belongs to, rather than implicitly creating/using a new Document.
- New Document: create an empty Document/container. Do not automatically create a Text inside it.
- Open Text: browse/search existing Texts.
Keep the central area focused on the currently edited Text.
2. Simplify Document browsing
Do not render every corpus Document as a large button grid.
Use a compact hierarchical browser in the sidebar. Group related Documents, for example:
MYS
  MYS_01
  MYS_02
  ...

and expand a Document only when the user wants to see/select its Texts. Use the existing treditor visual language where appropriate.
Remove redundant instructional copy such as:
Choose a Document and Text, enter original text with spaced transcription, then Save.
and similar explanations that the interface itself can make obvious.
3. Make bulk entry the primary workflow for a new Text
The preferred input format is alternating source/transcription lines:
美阿止都久留
mi ato tukuru
伊志乃比鼻伎波
isi no pibiki pa
阿米爾伊多利
ame ni itari

Provide a compact bulk-entry area with Preview before applying it. Show the parsed numbered pairs so the user can verify that pairing/numbering is correct, then add/apply them to the Text. Afterward they remain individually editable.
Individual row creation should remain available as a lightweight secondary action, not the primary new-Text workflow.
4. Make source editing compact
Do not use a large card headed Passage 1, Passage 2, etc.
The ordinary editor should be visually closer to:
1  Text           [美阿止都久留]
   Transcription  [mi ato tukuru]

2  Text           [伊志乃比鼻伎波]
   Transcription  [isi no pibiki pa]

Show only the visible numbers 1, 2, 3...; do not repeat Passage, Line, or another unit name on every row.
Check the repository/guidelines for the established internal term for these source units rather than inventing terminology, but keep that technical term out of the repetitive normal UI.
Inputs should size compactly to their content and grow when genuinely needed. Avoid large fixed-height textareas and verbose labels such as Spaced transcription for passage 6; Text and Transcription are sufficient.
Allow insertion between existing rows, not only at the end. A lightweight + between rows is sufficient. Inserting between 2 and 3 should make the visible numbering become 1, 2, 3, 4... while preserving persistent identities underneath. Use similarly unobtrusive controls for removal.
5. Improve hierarchy readability
The current preserved-analysis display uses nested bullet points, which makes tree structure difficult to read. Replace bullets with generated tree/indentation guides: vertical connector lines and/or clear same-level indentation similar to the intended structured-tree editor.
Do not require users to maintain connector characters manually.
6. Fix layout instability
Expanding/collapsing paired-source or related sections must not unexpectedly change the width of the main editing area. Keep the workspace dimensions/layout stable.
This is still not a final visual redesign. Keep the existing COJ/treditor style, but make the Stage 2 workflow compact and practical for long texts.
Do not start Stage 3 assisted analysis or Stage 4 tree editing yet.
If any requested behavior conflicts with the current Document/Text model or repository evidence, ask me rather than guessing. Otherwise implement these usability corrections and briefly tell me how to test them.

### After commit 8c3dfc5
Please make another Stage 2 usability pass before proceeding to Stage 3. The current data model can remain unchanged; this is mainly a workflow and UI correction.
1. Redesign New Text / New Document as flexible drafts
Keep New Text, Open Text, and New Document as equal-level actions in the Editing sidebar, but make them visually consistent with the existing Workbench/sidebar UI rather than small secondary-looking controls.
Creating and saving should not be unnecessarily coupled:
- New Text should immediately create an unsaved blank Text that the user can start editing. Do not require choosing a Document first. When the user later saves, they can choose which existing Document to add it to or create a new Document.
- New Document should immediately create an unsaved Document containing one blank Text, so the user can start working immediately. The user can add more Texts to it before saving and choose its final Document name when saving.
- Unsaved Texts/Documents should be able to remain as session drafts while the user temporarily navigates elsewhere and returns to them. Do not force premature naming/storage decisions.
Saving remains explicit/manual.
2. Redesign Open Text as a compact master-detail browser
Do not show every Document as a button or put most works under an artificial Other corpus documents category.
The left side should show works/document groups, left-aligned and visually compact:
BS
EN
KK
MYS
  MYS_01
  MYS_02
  ...
...

Only works that genuinely contain multiple storage Documents need a second level. For example, MYS_* belongs under MYS; a single-Document work should not get a redundant extra level.
Selecting a Document should show its Texts on the right side. Keep the existing search functionality.
Do not add a separate Current Document category; current editing state can be shown in the workspace itself.
3. Rename and fix Bulk Entry as Text Input
Text Input is an independent editable scratch/input area for fast typing and pasting. It is not the authoritative Source and should not automatically synchronize with Source.
It should support normal editing, scrolling and full-content browsing, including when an existing Text is open.
The expected alternating-line format is:
美阿止都久留
mi ato tukuru
伊志乃比鼻伎波
isi no pibiki pa
阿米爾伊多利
ame ni itari

Workflow:
Text Input
    → Preview
    → review parsed numbered pairs
    → Add to Source

Use Add to Source consistently as the action label.
Source is the authoring input used by later analysis; Text Input remains a scratch representation. Source edits do not automatically rewrite Text Input, and Text Input edits do not affect Source until the user explicitly applies them.
If Source is empty, Add to Source simply creates the parsed Source rows.
If Source already contains rows, default to adding the previewed pairs to the end. Provide a secondary destructive option to Replace entire Source, with a clear confirmation showing what will be replaced. Do not make replacement as easy to trigger accidentally as ordinary addition.
Replacing Source must follow the existing permissive-draft policy: do not silently delete or rewrite existing annotated hierarchy. Preserve affected analysis/evidence and mark invalid or uncertain relationships unresolved.
Source → Text Input synchronization, if added later, must also be explicit rather than automatic.
4. Keep Source compact and authoritative
After Add to Source, the parsed content appears in the normal compact numbered Source editor:
1  Text           [美阿止都久留]
   Transcription  [mi ato tukuru]

2  Text           [伊志乃比鼻伎波]
   Transcription  [isi no pibiki pa]

Keep the existing lightweight + insertion between rows, automatic visible renumbering, removal and undo. Do not return to large per-passage cards.
5. General UI cleanup
Keep the central workspace focused on the current Text. Use the sidebar for document/text navigation and creation.
Reuse the visual language, spacing, button sizing and hierarchy of existing well-designed treditor/Workbench UI where appropriate rather than introducing another control style.
Keep Document lists and labels left-aligned. Remove redundant instructional prose where the controls already make the workflow clear.
Preserve the recent compact Source layout, stable workspace width and generated hierarchy guides.
Do not implement Stage 3 assisted analysis or Stage 4 tree editing yet.
If any requested behavior conflicts with the current model or requires an unresolved semantic decision, ask me rather than guessing. Otherwise implement this usability pass and briefly explain how to test New Text, New Document, Open Text, Text Input → Preview → Add to Source, and Save/Reopen.

### After commit 2d6ea25
Please make three small Stage 2 UI fixes. Do not change the data model or begin Stage 3.
1. New Document numbering: investigate why a fresh session currently starts with Untitled Document 3 rather than Untitled Document 1, and fix the draft naming/counting behavior. Do not guess the cause; verify the current state logic first.
2. Text Input: when empty, leave the input area visually empty. Remove the current example text (美阿止都久留 / mi ato tukuru / ...) from the editable area/placeholder because it looks like real preloaded content. The input format is already clear from the workflow and Preview behavior.
3. Open Text work list: EN, MYS and SM should use the same left alignment, font size/weight and general row styling as FK, JSHT, KH, KK, NSK, etc. Their only additional affordance should be a small expand/collapse indicator on the right. Do not right-align or visually emphasize the work name itself.
Keep everything else unchanged. Run the relevant tests and briefly report the cause of the Untitled Document 3 issue and what was changed. If anything about the intended behavior is unclear or requires an assumption not established by the current design/repository, ask me before deciding or implementing it. Do not guess.

### After commit d6edd91
Before implementing Stage 3, investigate the repository and prepare a concise design/feasibility analysis for assisted recursive analysis and refinement. Do not change code yet.
Inspect the actual corpus, dictionary, annotation guidelines/issues, existing processors/search code, and relevant tests. Determine what evidence is genuinely available for assisting annotation after Source has been entered, for example:
taka yuku ya

The intended goal is to pre-fill as much well-supported analysis as possible, including:
- lemma IDs;
- node categories/tags such as ADJ-STM, VB-ADC, P-FOC;
- supported finer segmentation/refinement;
- recursive tagged subtree patterns such as paruyama → paru + yama;
- parent/component lemma associations and existing compound structures;
- attested forms under existing lemma entries.
The workflow should remain pre-fill → user reviews → user corrects exceptions, not repeated confirmation dialogs.
Please investigate and report:
1. What corpus/dictionary evidence can reliably support each kind of suggestion, and what existing code/indexes can be reused.
2. How ambiguous cases should be recognized and presented—for example multiple lemma/category candidates versus a strongly supported existing attestation.
3. How whole previously attested tagged subtrees can be suggested for a new occurrence without assuming that every occurrence of the same form/lemma has identical structure.
4. How the user should efficiently correct a wrong lemma, category, segmentation, or proposed subtree.
5. How manual script annotation should work at this stage, especially multi-selection/batch PHON or LOG with individual exceptions.
6. What Analyse should do for:
   - a new/unanalysed Text;
   - partially analysed material;
   - an imported Text that already has an annotated hierarchy.
Existing authored/imported analysis must never be silently overwritten. Editing Source does not automatically reanalyse it. Analyse is an explicit user action, and suggestions that would alter existing analysis must remain reviewable rather than being silently applied.
Use concrete repository examples such as taka, yuku, paruyama, titipapa, takayuku, and multipart ipaku where useful. Distinguish evidence-supported behavior from heuristics that would require a new linguistic decision.
Also identify any Stage 3 behavior that is still underspecified and needs my decision before implementation.
Do not guess unresolved linguistic or workflow semantics. If the repository evidence and existing requirements do not determine something, ask me rather than choosing a behavior yourself. Do not implement Stage 3 yet.

#### After commit d6edd91 (2)
Here are my decisions for the unresolved Stage 3 behaviors. Please incorporate them into the Stage 3 design, verify them against the repository, and report any remaining implementation-critical questions. Do not implement Stage 3 yet.
1. Default eligibility and evidence
Dominant attestation evidence may be used to pre-fill the editable default even when it is not 100% conflict-free. The goal is to reduce repetitive manual annotation.
- Strong/dominant evidence → pre-fill the best-supported analysis, while making it easy to inspect and change.
- Genuinely ambiguous/non-dominant evidence → present multiple candidates rather than arbitrarily choosing one.
- Frequency is evidence, not linguistic certainty.
EN and SM must be treated as a separate evidence domain. Other Documents must not currently use EN/SM annotations as evidence for defaults or ranking. EN/SM may use evidence from the rest of the corpus. Preserve/flag their editorial status appropriately.
Pre-filling must never hide or remove alternative candidates. For example, if one lemma/category analysis accounts for 95% of relevant attestations and another for 5%, the 95% candidate may be pre-filled, but the user must still be able to inspect the alternatives and switch directly to the 5% candidate. Pre-fill means an editable default, not an accepted or locked decision.
2. Automatic subtree scope
Assisted Analyse may pre-fill supported structure through the word level, including recursive lexical/morphological/compound structure and word-level structures such as MK where the repository’s existing segmentation/annotation rules classify them as words.
Do not automatically construct phrase-level or higher syntax at this stage.
Please inspect the existing annotation/segmentation guidelines and corpus rules for the established word/phrase boundary rather than inventing a new definition. If MK or another category has context-dependent status that makes this rule insufficient, show me the concrete evidence and ask.
3. Incomplete analysis and deletion/refinement
A missing lemma on a current leaf/terminal normally indicates unfinished annotation: theoretically the final lowest-level analysed components should have lemma IDs. An internal/higher node does not necessarily require a lemma.
Verify actual corpus exceptions (NULL, traces, special tags, unresolved editorial cases, etc.) from the repository before encoding validation rules. Do not infer completeness from lemma == null without accounting for documented exceptions.
When the user explicitly deletes/withdraws an analysed child or refinement, treat that as a real deletion from the current model rather than permanently retaining detached/orphaned analysis merely for possible recovery.
- Provide ordinary session undo/redo, similar to a normal text editor.
- Undo history is transient UI/session state and should not be persisted in .syn.json.
- It may be discarded when the editing page/session is closed; long-term version recovery belongs to Git.
- If a node being deleted is still referenced by current alignment, legacy anchors or other meaningful data, do not leave dangling references or silently discard those relationships. Show the impact and require appropriate resolution/confirmation.
This is different from deleting Source material: deleting Source must not imply that the user intended to delete existing linguistic analysis, so affected analysis remains preserved/unresolved under the policy already established.
4. Batch script assignment
Script annotation should support efficient downward assignment where that is linguistically appropriate. If a lexical whole is assigned PHON, its component material should also be PHON; otherwise the whole would not consistently be PHON.
Therefore selecting an appropriate higher lexical node and assigning PHON should be able to apply to its relevant descendant terminal/writing units, with undo and individual correction afterward.
However, do not generalize this blindly to every internal syntactic node or every script value. Inspect the existing corpus representation and annotation guidelines to determine where script annotations actually live and how LOG/PHON/multipart cases behave. Preserve existing mixed-script evidence such as multipart forms rather than overwriting it by assumption.
The intended interaction remains pre-fill → review → correct exceptions, with Analyse as an explicit user action. Existing imported/authored hierarchy must never be silently overwritten by re-analysis.
Please update the Stage 3 design accordingly and tell me:
- what concrete evidence/ranking policy you recommend implementing from these rules;
- what corpus exceptions affect completeness or script propagation;
- whether any semantic/workflow decision is still required before implementation.
Do not guess unresolved behavior. If the requirements and repository evidence do not determine something, ask me before deciding. Do not implement Stage 3 yet.

#### After commit d6edd91 (3)
Please now update syntax-tree-authoring-design.md to incorporate the Stage 3 findings and decisions from this review. Do not implement Stage 3 yet.
In particular, record:
- Evidence ranking: use configurable ≥95% support across at least 3 distinct Texts as the conservative initial gate for pre-filling a dominant candidate. This is a suggestion policy, not an annotation rule. All attested alternatives must remain accessible and directly selectable.
- Evidence domains: ordinary and unnamed Texts exclude EN/SM evidence. Explicitly identified EN/SM Texts may use both ordinary and EN/SM evidence, with the domains distinguishable. Do not add an evidence-domain selector for ordinary unnamed drafts. EN/SM must not contribute to ordinary defaults until I explicitly authorize that later.
- MK: retain MK as a special Stage 3-eligible Word category. Supported internal tagged subtrees, including internal PP/IP structures, may be suggested. Preserve distinct attested structural alternatives rather than assuming one invariant structure per lemma. Do not generalize MK behavior to other Word categories without repository evidence.
- Automatic scope: Stage 3 may construct evidence-supported lexical/morphological/word-level recursive analysis. Do not automatically construct ordinary phrase-level or higher syntax beyond the established eligible Word structures.
- Completeness: final lowest-level analysed components are normally expected to have lemma IDs, while internal/higher nodes need not. Encode actual documented exceptions rather than treating every missing lemma identically.
- Refinement deletion: explicitly deleting/withdrawing analysis removes it from the current model. Keep ordinary session undo/redo only; do not persist editing history in .syn.json. Git provides long-term history. Existing references must be handled explicitly rather than left dangling. This remains distinct from deleting Source, which preserves affected analysis as unresolved.
- Script annotation: model this as efficient scope-based batch annotation, not parent→child inheritance. Determine applicable terminals/writing parts from the actual corpus model. Batch assignment fills empty applicable values by default and preserves existing script annotations; changing an existing value requires explicit override/edit. Support useful scopes such as explicit multi-selection, source line, subtree, or unannotated applicable units in the Text where appropriate.
- Analyse: remains an explicit action. Existing imported/authored analysis is never silently overwritten; proposed changes to existing analysis require review.
Update any earlier Stage 3 proposals that conflict with these findings, including the previous MK and script-propagation assumptions.
Then give me a concise assessment of whether any implementation-critical semantic or workflow decisions still remain unresolved before Stage 3 can begin. Distinguish genuine blockers from questions that can safely remain deferred to later stages.
Do not implement anything yet. Do not guess unresolved behavior. If a decision is genuinely required and neither the repository nor these requirements determines it, ask me.

### After commit 43d15e6
Proceed with Stage 3: assisted recursive analysis and refinement, following the current syntax-tree-authoring-design.md and all decisions recorded there.
Implement Stage 3 incrementally inside the existing Editing feature. Do not begin Stage 4 tree construction or Stage 5 export work.
The main workflow should be:
Source
  → Analyse
  → evidence-based pre-fill / candidates
  → user reviews and corrects exceptions
  → optional downward refinement
  → batch script annotation

Implement:
- an attestation/evidence index using corpus and dictionary evidence for surface forms, lemma/category combinations and recursive tagged subtree patterns;
- lemma and category suggestions with provenance/evidence available for inspection;
- the configurable initial dominant-evidence gate of ≥95% across at least 3 distinct Texts;
- dominant candidates as editable defaults while keeping all attested alternatives directly accessible;
- the established EN/SM evidence-domain policy;
- supported recursive subtree suggestions/refinement, including compound structures and eligible MK structures according to the documented repository rules;
- fresh persistent identities when a suggested subtree is instantiated for a new occurrence;
- efficient inline correction of lemma/category/candidate structure without repeated confirmation dialogs;
- dictionary/gloss access using the existing treditor infrastructure;
- scope-based batch script annotation over applicable terminals/writing parts, filling empty values by default and preserving existing non-empty script annotations unless explicitly overridden;
- clear handling of incomplete/unsupported analysis as a valid draft.
Analyse must remain an explicit user action. Source edits must not trigger re-analysis. Existing imported/authored hierarchy must never be silently overwritten; proposed changes to existing analysis require review/acceptance.
Automatic construction should remain within the Stage 3 word-level/eligible lexical analysis scope defined in the design. Do not start ordinary phrase-level or higher syntax construction that belongs to Stage 4.
Do not implement general whole-refinement withdrawal or automatic parent reconstruction; that behavior is explicitly deferred. Ordinary session undo/redo is sufficient for recent operations.
Preserve the Stage 1+2 workflow and persistence behavior. Do not migrate the corpus, modify dictionary entries automatically, or write back to TXT/XML.
Add focused tests using the established cases such as taka, yuku, paruyama, titipapa, takayuku, eligible MK variants and multipart ipaku. Verify that suggestions never mutate corpus/dictionary source data and that save/reopen preserves accepted analysis and identities.
After implementation, give me a concise summary of what changed and a practical workflow for testing Stage 3 in the UI.
If implementation requires any linguistic/workflow behavior not determined by the current design or repository evidence, stop and ask me before deciding. Do not guess or silently introduce a new annotation rule.

### TBD
2. The current search interface features separate buttons for "Text search" and "TGrep2," requiring users to switch between them—which is quite inconvenient. Could these be merged into a single search box? This would allow users to perform either type of search directly in one place, with the program automatically detecting the input and returning the appropriate results.

合并搜索框
搜索结果下载

1. 词典
词典搜索结果页面显示优化
新增的词条检测lemma id

2. 增加首页

3. 图标设计

4. 编辑器合并

5. 文本编辑和添加功能，以及如何将搜索功能和它们联合使用

6. 升级 tgrep2






# Paused

<details><summary> Click to expand </summary>

## Build interactive editor

An essential purpose for this repository is to facilitate research for linguists. The conventional text-declarative way of uploading and editing data poses a significant hurdle.
Create a simple GUI which allows the user to perform CRUD on the database. In particular, provide an interactive editor of corpora and syntax trees.

### Features

- For right now:
  1. User can browse the corpora database, with syntax trees rendered
  2. User can view the dictionary
  3. User can search for corpus by keyword
  4. User can query the dictionary

- Next step:
  1. User can create / modify / delete entries in the dictionary
  2. User can create / modify / delete corpora.

### After commit c9e699cc

This is a great starting point.
Next commit should focus on improving tree rendering.
Linguists view syntax trees very differently from computers. A verbatim presentation of the XML is actually *not* a good visualisation of the trees.
For linguists, the basis of all the trees are the *words themselves*. The word forms, e.g. mi, kusa, ramu, should be what gets displayed as the leaf level nodes. The intermediate nodes in the hierarchy are combinations of the leaves.
Ideally, the bottom layer of the syntax tree is just the original sentence, displayed flat. The tokens in the sentence could have flexibly calculated spacings to fit the intermediate nodes in display. To make this work, the tree has to be rotated from the current vertical layout.
Let's also enable element toggle, i.e. user can select what to show and hide in the tree view.
A diagram for how it would ideally look is given at `8096.png`.

### After commit 878aa270

Basically correct.
A major issue is that currently leaf-level tags are ignored. Render them above the actual word forms. In other words, keep the original tag-tree fully rendered, and align the word forms with each leaf-level tag in the end.

### After commit 467d3067

1. Visual clutter. Check the screenshot for details. Adjust horizontal spacing.
2. Option of bottom-up vertical aligning. The current align is top-down: nodes same level from the *root* gets aligned. Include another option of bottom-up align which may have greater visual appeal to linguists. Allow the user to toggle align mode, but make bottom-up default.

### After commit 908015ac

Horizontal spacing: This is a purely aesthetic optimisation. The current tree could benefit from a horizontal adjustment of non-leaf node positions, where the x-coordinate is determined not by the mean of its direct children, but the mean of all its recursive leaf node content. This will hopefully make the tree appear more "upright" and therefore more pleasant.

### After commit bd67a7bd

Vertical spacing: Sometimes the lines intersect. Usually it's not a problem, but let's try to address it anyway by allowing the user to customise vertical spacing with a slider.

### After commit 2debd889

## Automated reasoner

Inactive (TBD).

</details>

# Completed

<details><summary> Click to expand </summary>

## Collect constants

Created `src/oncoj/common/` sub-package. ANSI escape codes and colour helpers (`bold`, `blue`,
`magenta`, `yellow`) extracted from `ascii_tree.py` into `oncoj.common.ansi`; `ascii_tree.py`
now imports from there. Linguistic constants remain in `oncoj.core.tags` (already centralised).

## Convert to Python Package

Added `[build-system]` and `[project]` tables to `pyproject.toml`. Package name `coj`,
version `0.1.0`, `requires-python = ">=3.11"`, no runtime dependencies. `src/` layout
declared via `[tool.setuptools.packages.find]`. Installable with `pip install -e .`;
dev extras (`pytest`, `ruff`) via `pip install -e ".[dev]"`.

## XML-native rewrite

Rewrote the entire codebase so that XML is the canonical format:

- `data/xml/` is primary; `data/txt/` is derived (generated by `xml2txt.py`).
- All in-memory objects (`CorpusLine`, `Utterance`, `CorpusDocument`) wrap
  `xml.etree.ElementTree` elements directly — mutations write through to the XML tree.
- `CorpusDocument.from_file` auto-detects `.xml` vs `.txt` by extension.
- `Dictionary.from_file` / `to_file` likewise auto-detect format.
- All three package-based processors (`lemmas_processor.py`,
  `compound_lemma_processor.py`, `mk_lemma_processor.py`) moved to
  `scripts/processors/` and rewritten to read/write `data/xml/`.
- `compound_lemma_processor` fully XML-native: group detection and NP expansion walk
  the `ET.Element` tree; compound ID insertion is `bare_n_elem.set("lemma", id)`.
- 221 tests pass; ruff lint clean.

## Data Representation Schema Redesign

Proposed and implemented a structured XML format for both corpus and dictionary data.
Two separate formats:
- Corpus/trees: `<document>` → `<block>` → nested syntactic elements, leaf nodes carry
  `form`, `phon`, `lemma` attributes.
- Dictionary: `<dictionary>` → `<entry id="…">` → typed field sub-elements.

Conversion scripts in `scripts/data_conversion/`: `txt2xml.py`, `xml2txt.py`, `export.py`.
Round-trips are lossless (verified by test suite).

## MK Lemma Processor

Finds `L099999` occurrences in text files, replaces them with real unique IDs, creates
corresponding makura-kotoba dictionary entries, and optionally normalises existing MK
entries missing `.COMPOUND` / `.MKTARGETNEW` lines.

## Lemmas Processor

Two-pass annotator: look up word forms in the dictionary (pass 1, with disambiguation
heuristic), assign new IDs to unknown words (pass 2). Optional dictionary normalisation.

## Compound Noun Lemma Processor

Detects adjacent `N` / `N;@2` / … sibling groups sharing a bare marker-`N`, pairs
component lemma IDs left-to-right in layers, inserts the outermost compound ID.
Optional NP expansion pre-pass wraps direct `N`-at children of `<NP>` in a bare `<N>`.

</details>

# Abandoned

<details><summary> Click to expand </summary>

## Build comprehensive editor

**Status:** Abandoned

The original plan was to build a comprehensive editor combining multiple editing functions.
Development was stopped because the interface and workflow became too complicated.
Relevant code remains under `compreditor/` for historical/reference purposes.

The user need a more comprehensive editor tool to facilitate the edit of data. Different functions need to be modularized to allow for the expansion of new features in the future. Create a GUI which allows the user to create, delete, read, update. Create a new folder named compreditor to store all these data and changes. Do not change data in other part of the repository. 

### Features
  1. Data layers
  User can open and edit the data in different layers: document, text (such as EN_01_1), sentence, and word. User can switch the focused layer among them. When read and edit the text at the sentence or word level, the user can see the context in bigger (sentence and text) level.
  User can also open and edit the dictionary.
  Generate the structure outline for the entire data. For example, text - EN - EN1 - EN1.1.
  2. Functional zones of the interface
  It should have a clean editing zone at the middle place to ensure the user's attention is focused on editing. The left and right function areas can be collapsed or popped up. 
  3. Edit mode
  Most users are not accustomed to editing raw XML data directly. So it is necessary to add other view and editing modes:
    text mode: the raw xml data is displayed in the form of plain text to show hierarchy and items. When click an item the user can change its tag or annotations, or add some annotations. The user can add branches, change the hierarchy structure. 
    table mode: all items is displayed in a table and the user can edit the table.
    tree mode: raw xml data is displayed in the syntax tree, and the user can add/delete/copy and paste/move the item/branches/annotations.
  4. Modularized fuctions
    3.1 Search
    The user can search the whole data (or choose a scope). The searched object can be a word (kamu), a lemma id (L000002), a tag (N), and so on. Or, it can also be a hierarchy structure of syntax tree. Or, it can be a relation of items.
    In advanced search, Users can feel free to specify inclusion or exclusion searching criteria at every logic point.
    3.2 Insert
    The user can insert a tag, a branch, some contents, and even add a new text. 
    Specially, when insert lemma ids, the word form can be searched in the dictionary. If it has multiple candidates, the user can choose one. Or, the user can create a new dictionary id and insert this lemma (in general create, no matter single or multiple). The user can set the beginning number of the automatical generated new lemma.
    The function can be combined with Search
    3.3 Delete
    The user can delete items.
    This function can be combined with search and/or insert to substitute.
    3.4 Revise
    The user can revise existing items.
  5. Validation
  The entire document is continuously checked. For example: A missing attribute; An element in the wrong location; A duplicate ID; An unclosed tag. These errors appear immediately in the Problems panel. Users can click on an error to navigate directly to it. After adding or deleting content, the interface needs to be updated in real time.

  </details>