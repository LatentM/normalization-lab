// HelpPanel.jsx — the mandatory Help section: a user manual.
//
// Written so that somebody who has never seen this page can operate it from
// this text alone. Every control is named, every input format is given, and
// the output is explained rather than just listed.

export default function HelpPanel({ onLoadExample }) {
  return (
    <>
      <div className="card">
        <h2>What this website does</h2>
        <p className="sub">
          You give it a relation schema and the dependencies that hold on it. It works out the
          candidate keys, tells you the highest normal form the relation satisfies and exactly which
          dependency stops it going higher, then decomposes it two different ways and checks whether
          each decomposition is safe. Every result is accompanied by the working, not just the answer.
        </p>
        <p className="sub">
          Nothing is uploaded and nothing is stored on a server. All the computation happens inside
          your browser, and your saved relations stay on this device.
        </p>
      </div>

      <div className="card">
        <h2>Step-by-step: your first analysis</h2>

        <ol className="manual">
          <li>
            <b>Find the input panel</b>
            <span>
              It is the column on the left, and it stays on screen at all times. It has two boxes:
              <b style={{ display: 'inline', fontWeight: 600 }}> Relation</b> at the top and
              <b style={{ display: 'inline', fontWeight: 600 }}> Dependencies</b> below it.
              On a narrow screen or a phone, the panel appears above the results instead.
            </span>
          </li>
          <li>
            <b>Type the relation into the first box</b>
            <span>
              A comma-separated list of attribute names, for example <code>A, B, C, D</code>. You may
              also write it as <code>R(A, B, C, D)</code>, and single capital letters may be run
              together as <code>ABCD</code>. Longer names such as <code>StudentId</code> are kept
              whole. Up to 16 attributes are accepted.
            </span>
          </li>
          <li>
            <b>Type the dependencies into the second box, one per line</b>
            <span>
              Write <code>A,B -&gt; C</code> for a functional dependency. Use <code>A -&gt;&gt; B</code>{' '}
              for a multivalued dependency and <code>*(AB, BC, CA)</code> for a join dependency —
              these two are only needed for the 4NF and 5NF sections. Anything after a <code>#</code>{' '}
              is treated as a comment and ignored.
            </span>
          </li>
          <li>
            <b>Watch for messages as you type</b>
            <span>
              The input is checked on every keystroke. A red message means the input cannot be used
              and names the line at fault; the Analyse button stays disabled until it is fixed. An
              amber message is a note, not an error — for example, telling you that an attribute used
              in a dependency was not declared and has been added for you.
            </span>
          </li>
          <li>
            <b>Press Analyse</b>
            <span>
              The button sits under the dependency box. The page computes everything at once and
              moves you to the Normal form section. On a large relation the button reads “Computing”
              for a moment — the key search examines 2ⁿ subsets, so more attributes means more work.
            </span>
          </li>
          <li>
            <b>Read the summary in the left panel</b>
            <span>
              Under the input boxes you will now see the relation, its candidate keys with the key
              attributes underlined, the non-prime attributes, and the highest normal form satisfied.
              These stay visible wherever you navigate.
            </span>
          </li>
          <li>
            <b>Move through the sections along the top</b>
            <span>
              Each one answers a different question. You can also move between them with the left and
              right arrow keys once a section has focus.
            </span>
          </li>
          <li>
            <b>Change a dependency and press Re-analyse</b>
            <span>
              When you edit the input, the results already on screen are dimmed and a note appears
              saying they are out of date. They are not deleted, so you can still read them — but they
              describe the previous relation until you press the button again.
            </span>
          </li>
        </ol>
      </div>

      <div className="card">
        <h2>What each control does</h2>
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Control</th><th>Where</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td><b>Analyse / Re-analyse</b></td><td>Left panel</td><td>Runs every computation on the current input. Disabled while the input has errors.</td></tr>
              <tr><td><b>Clear</b></td><td>Left panel</td><td>Empties both input boxes.</td></tr>
              <tr><td><b>Worked examples</b></td><td>Setup section</td><td>Loads a ready-made relation chosen to demonstrate one specific thing. The description under each says what.</td></tr>
              <tr><td><b>Save</b></td><td>Setup section</td><td>Stores the current relation in this browser under a name you choose, so you can return to it later.</td></tr>
              <tr><td><b>Load / Delete</b></td><td>Setup section</td><td>Recalls or removes a saved relation.</td></tr>
              <tr><td><b>Attribute buttons</b></td><td>Closure section</td><td>Click attributes to build a set; the closure of that set is computed as you click. Click again to remove one.</td></tr>
              <tr><td><b>Show the working</b></td><td>Decomposition</td><td>Reveals the split-by-split trace, the chase tableau and the per-dependency preservation table.</td></tr>
              <tr><td><b>List them</b></td><td>Closure section</td><td>Expands the full list of superkeys, which is usually long.</td></tr>
              <tr><td><b>Hint / Show explanation</b></td><td>Practice</td><td>The hint names the rule to apply; the explanation gives the full derivation.</td></tr>
              <tr><td><b>Download buttons</b></td><td>Download</td><td>Generates the complete worked solution as a PDF, Word document or text file.</td></tr>
              <tr><td><b>Day / Night</b></td><td>Top right</td><td>Switches the colour scheme. Your choice is remembered on this device.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>How the processing works</h2>
        <p className="sub">
          In the order the lab performs it. Each stage feeds the next, which is why an error in the
          input has to be fixed before anything can run.
        </p>
        <ul className="contents-list">
          <li><b>1</b><span><b>Parse.</b> The two text boxes become structured data — an attribute list and lists of functional, multivalued and join dependencies. Errors are reported by line number.</span></li>
          <li><b>2</b><span><b>Closure.</b> For a given attribute set, repeatedly apply any dependency whose left side is already held, until nothing new can be added.</span></li>
          <li><b>3</b><span><b>Keys.</b> Every subset is examined smallest-first. A subset whose closure covers the relation is a superkey; one containing no smaller key already found is a candidate key.</span></li>
          <li><b>4</b><span><b>Minimal cover.</b> Right-hand sides are split, extraneous left-hand-side attributes are removed, then redundant dependencies are removed — in that order.</span></li>
          <li><b>5</b><span><b>Normal form.</b> Each rung from 1NF to BCNF is tested independently against its own definition, so a failure at 2NF does not hide the 3NF result.</span></li>
          <li><b>6</b><span><b>Decomposition.</b> 3NF is built up from the minimal cover; BCNF is broken down by splitting on violations. Both run on every input.</span></li>
          <li><b>7</b><span><b>Verification.</b> The chase proves whether each decomposition is lossless; a separate test checks whether every dependency survives.</span></li>
          <li><b>8</b><span><b>Higher forms.</b> If you supplied multivalued or join dependencies, 4NF and the scoped 5NF check run as well.</span></li>
        </ul>
      </div>

      <div className="card">
        <h2>How to read the output</h2>
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>What you see</th><th>What it means</th></tr></thead>
            <tbody>
              <tr><td><span className="set key">AB</span> underlined</td><td>A candidate key. The underline is the standard textbook notation for key attributes.</td></tr>
              <tr><td><span className="fd"><span className="set">A</span><span className="arrow">→</span><span className="set">B</span></span></td><td>A functional dependency: A determines B.</td></tr>
              <tr><td><span className="fd"><span className="set">A</span><span className="arrow">↠</span><span className="set">B</span></span></td><td>A multivalued dependency: for each A, the set of B values is independent of everything else.</td></tr>
              <tr><td><code>AB⁺</code></td><td>The closure of AB — everything reachable from those attributes.</td></tr>
              <tr><td>A green ✓ on the ladder</td><td>That normal form is satisfied.</td></tr>
              <tr><td>A red ✗ on the ladder</td><td>That normal form is violated. The dependency underneath is the exact cause.</td></tr>
              <tr><td>≈ beside 1NF</td><td>Assumed, not tested. Atomicity is a property of the stored values and cannot be decided from a dependency set.</td></tr>
              <tr><td><code>a1</code> in the tableau</td><td>“Definitely the same value.” A row that becomes all a-symbols proves the decomposition is lossless.</td></tr>
              <tr><td><code>b23</code> in the tableau</td><td>“Possibly a different value.”</td></tr>
              <tr><td>✗ loses dependencies</td><td>Some constraint can no longer be checked inside one fragment. The dependency is named directly underneath.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Try it now</h2>
        <p className="sub">
          This relation is the one worth seeing first: the two decomposition algorithms disagree on
          it, and that disagreement is the central result of the whole topic.
        </p>
        <div className="btn-row">
          <button className="btn" onClick={() => onLoadExample('A, B, C, D', 'A,B -> C\nC -> D\nD -> A')}>
            Load the example and go to Setup
          </button>
        </div>
      </div>

      <div className="card">
        <h2>If something does not work</h2>
        <div className="tbl-wrap">
          <table className="data">
            <thead><tr><th>Symptom</th><th>Cause and fix</th></tr></thead>
            <tbody>
              <tr><td>The Analyse button is greyed out</td><td>Either the relation box is empty, or there is a red error message. Fix the line it names.</td></tr>
              <tr><td>A section in the top navigation is greyed out</td><td>That section needs a computed result. Press Analyse first.</td></tr>
              <tr><td>“Beyond what this lab will attempt”</td><td>More than 16 attributes. Key search is over 2ⁿ subsets, so the page refuses rather than freezing. Split the relation.</td></tr>
              <tr><td>The 4NF section says nothing to test</td><td>You have not entered a multivalued dependency. Add a line such as <code>A -&gt;&gt; B</code>.</td></tr>
              <tr><td>Saving is unavailable</td><td>The browser is blocking site storage, usually in private mode. Everything else still works.</td></tr>
              <tr><td>Results look wrong after editing</td><td>Check for the amber “out of date” note — the displayed results belong to the previous input until you press Re-analyse.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
