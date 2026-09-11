OT Cybersecurity Factory Game – Master Development Prompt

1. Role

You are a senior game developer, UX designer, and industrial OT/ICS cybersecurity expert.

Your task is to design and build a browser-based interactive educational game that teaches players how an industrial factory is structured across OT/IT levels and how cybersecurity, connectivity, assets, data flows, and dependencies work across those levels.

The game should feel like a modern industrial digital-twin / strategy game, not like a traditional cybersecurity training slide deck.

The player should be able to visually explore a factory, click on levels and equipment, zoom into areas, inspect components, discover vulnerabilities, understand dependencies, and eventually improve the factory's cybersecurity posture.

The game must be designed so that additional factories, levels, assets, scenarios, attacks, and missions can be added later without rewriting the core architecture.

---

2. Core Game Concept

The factory is represented as a multi-level digital fabric.

At the beginning, the player sees the entire factory as an overview.

The factory consists of multiple horizontal levels/floors representing the industrial architecture.

Conceptually, use a Purdue-style structure, but do not make the game look like a static Purdue diagram.

Example:

- Level 5 – Enterprise / External
- Level 4 – Business / IT
- Level 3.5 – Industrial DMZ
- Level 3 – Site Operations
- Level 2 – Supervisory Control
- Level 1 – Control
- Level 0 – Physical Process

The exact terminology can be configurable.

Each level visually represents part of the factory.

The levels should look like actual industrial environments rather than boxes in a network diagram.

For example:

Level 0:

- Pumps
- Motors
- Valves
- Tanks
- Sensors
- Actuators
- Production equipment

Level 1:

- PLCs
- Remote I/O
- Safety systems
- Controllers

Level 2:

- HMI
- SCADA
- Engineering stations
- Operator stations

Level 3:

- Historians
- OT servers
- Maintenance systems
- Asset management
- Operations applications

Level 3.5:

- Industrial DMZ
- Jump servers
- Firewalls
- Remote access
- Security monitoring

Level 4:

- ERP
- Business systems
- Office IT
- Analytics
- Cloud connectivity

Level 5:

- External systems
- Suppliers
- Remote workers
- Cloud services
- Internet

---

3. First Player Experience

The first screen must immediately communicate:

"This is a factory that I can explore."

Do NOT start with a traditional menu.

The player should see the complete factory.

The factory should visually resemble a cross-section / vertical architectural view.

Each level should be clearly visible.

The player can:

- Hover over a level
- See the level highlighted
- Click the level
- Enter that level
- Zoom into the level
- Explore individual assets
- Click assets
- See information
- Follow connections/data flows
- Discover problems

The overview should be visually impressive even before the player understands the game mechanics.

---

4. Level Navigation

When the player clicks a level:

That level should transition from the overview into a full-screen detailed view.

Use a smooth camera/zoom transition rather than simply replacing the screen.

Example:

Factory overview

↓

Player clicks Level 2

↓

Camera moves toward Level 2

↓

Level 2 fills the screen

↓

Detailed industrial environment appears

The player can then interact with individual components.

Provide a clear navigation mechanism to return to the full factory overview.

Possible UI:

- Breadcrumb
- Back button
- Mini-map
- Level indicator
- Zoom indicator

Avoid clutter.

---

5. Detailed Level Design

Every level should contain actual objects.

Objects must be visually meaningful.

For example, Level 2 could contain:

- SCADA server
- HMI workstation
- Engineering workstation
- Historian connection
- PLC connections
- Network switch
- Firewall
- Operator station

The player should be able to click each object.

Clicking an object opens an information panel.

Example:

SCADA SERVER

Status:
● Online

Function:
Supervisory control and data acquisition

Connections:
→ PLC-01
→ Historian
→ HMI-01

Security:
● Patch status: Outdated
● MFA: Disabled
● Network zone: OT

Risk:
HIGH

The information should be progressively revealed rather than overwhelming the player.

---

6. Visual Language

The visual design is extremely important.

The game should combine:

- Industrial digital twin
- Modern strategy game
- Network visualization
- Interactive factory simulation
- Cybersecurity dashboard

Avoid:

- Generic corporate dashboards
- Flat PowerPoint-style diagrams
- Excessive neon cyberpunk styling
- Too much text
- Generic icons floating in empty space

The factory should feel physical.

Use:

- Buildings
- Machines
- Pipes
- Control rooms
- Electrical cabinets
- Servers
- Network equipment
- Production lines
- Tanks
- Pumps
- Conveyor systems
- Sensors
- Industrial equipment

The network architecture should be integrated into the physical environment.

---

7. Interactivity

Everything important should be clickable.

Examples:

Factory
→ level

Level
→ building/area

Area
→ machine

Machine
→ controller

Controller
→ PLC

PLC
→ network

Network
→ firewall

Firewall
→ connection

Connection
→ destination

The player should gradually discover how the factory is connected.

Hover should provide lightweight feedback.

Click should provide deeper information.

Double-click or zoom should provide more detail where appropriate.

---

8. Connections and Data Flow

Connections between assets are a core game mechanic.

Visually represent:

- Network connections
- Control signals
- Sensor data
- Process data
- Business data
- Remote access
- Internet connections

Different types of connections should have different visual behavior.

For example:

Control:
PLC → Actuator

Telemetry:
Sensor → PLC → SCADA

Historian:
SCADA → Historian

Business:
Historian → Analytics → ERP

Remote:
External → DMZ → Jump Server → OT

The player should be able to select a connection and understand:

- Source
- Destination
- Protocol
- Direction
- Purpose
- Trust zone
- Security controls

---

9. Cybersecurity Gameplay

The game should eventually become a cybersecurity game rather than only a factory visualization.

Introduce cybersecurity concepts through gameplay.

Examples:

- Unpatched PLC
- Unsupported operating system
- Flat network
- Excessive network access
- Weak remote access
- Missing MFA
- Shared accounts
- Unknown assets
- Unauthorized USB
- Poor segmentation
- Exposed engineering workstation
- Insecure vendor access
- Weak firewall rules
- Missing monitoring
- Compromised credentials

The player should identify weaknesses and decide how to mitigate them.

---

10. Attack Scenarios

Create an architecture that supports attack scenarios.

Example scenario:

"Vendor Remote Access Compromise"

Attack path:

Internet
→ Vendor account
→ VPN
→ Industrial DMZ
→ Jump Server
→ Engineering Workstation
→ PLC
→ Process

The game should visually show the attack path.

The player must detect and stop the attack.

Possible controls:

- Enable MFA
- Segment network
- Disable unnecessary access
- Configure firewall
- Isolate workstation
- Improve monitoring
- Disable account
- Patch system

The game should teach the player WHY each action matters.

---

11. Risk System

Each asset should have security attributes.

Example data model:

Asset:

- id
- name
- type
- level
- zone
- criticality
- availability
- confidentiality
- integrity
- patchStatus
- authentication
- networkExposure
- connections
- vulnerabilities
- owner

Calculate a simplified risk score.

Example:

Risk = Likelihood × Impact

Do not attempt to replicate a real enterprise risk methodology initially.

The system should be understandable and game-oriented.

---

12. Game Progression

The player should begin with a partially unknown factory.

For example:

KNOWN:

- Main production line
- PLCs
- SCADA

UNKNOWN:

- Old engineering workstation
- Vendor connection
- Forgotten network switch
- Legacy PLC
- Unsecured remote access

The player investigates.

As the player discovers assets, the factory map becomes more complete.

This creates an exploration mechanic.

---

13. Mission System

Build the architecture around missions.

Example missions:

Mission 1 – Understand the Factory

"Identify the main OT levels."

Reward:
+100 knowledge

Mission 2 – Find Critical Assets

"Identify the three most critical assets."

Mission 3 – Secure Remote Access

"Find the vendor's remote access path and secure it."

Mission 4 – Stop the Attack

"An attacker has entered the OT network. Find the attack path."

Mission 5 – Improve Segmentation

"Reduce unnecessary communication between IT and OT."

Mission 6 – Protect the Production Process

"Improve the cybersecurity posture without disrupting production."

---

14. Important Game Design Principle

Do not turn the game into a checklist.

The player should learn by:

OBSERVE
→ EXPLORE
→ DISCOVER
→ UNDERSTAND
→ DECIDE
→ ACT
→ SEE CONSEQUENCE

Every cybersecurity decision should have consequences.

For example:

Blocking a connection may improve security but break production.

Patching a PLC may improve security but require downtime.

Adding monitoring may improve detection but increase cost.

Adding segmentation may improve security but require architecture changes.

The game should therefore involve trade-offs.

---

15. Factory State

The factory should have an overall state.

Example:

Security:
72%

Availability:
96%

Visibility:
64%

Segmentation:
48%

Resilience:
71%

Operational risk:
MEDIUM

These values should change dynamically based on player actions.

---

16. UI Structure

Keep the UI minimal.

Main screen:

Top:

- Factory name
- Security score
- Mission
- Alerts

Center:

- Factory visualization

Bottom/side:

- Contextual information

When an asset is selected:

Right-side information panel.

Do not permanently cover a large portion of the factory.

The visualization is the primary interface.

---

17. Camera and Zoom

Implement a clear camera hierarchy:

Factory overview
→ Level
→ Area
→ Asset

Use smooth transitions.

The player should always understand where they are.

Provide:

- Zoom
- Pan
- Reset view
- Back
- Mini-map if necessary

Do not allow the player to become lost.

---

18. Technical Architecture

Build this as a browser application.

Prefer:

- React
- TypeScript
- Vite
- SVG / Canvas for visualization
- CSS animations
- Modular game-state architecture

If a different technology is substantially better for the visualization, explain why before changing the stack.

The architecture must separate:

1. Game engine/state
2. Factory data
3. Visualization
4. UI
5. Missions
6. Cybersecurity logic
7. Scoring
8. Save/load state

Do not hard-code the factory into UI components.

---

19. Data-Driven Factory

Create factory configuration as data.

Example:

factory.json

levels:

- id
- name
- description
- elevation
- assets

assets:

- id
- name
- type
- position
- level
- status
- properties
- connections

connections:

- source
- target
- type
- protocol
- direction
- security

This will allow new factories to be added later.

---

20. Component Architecture

Use reusable components such as:

FactoryOverview
LevelView
Asset
AssetDetails
Connection
NetworkPath
MissionPanel
SecurityPanel
AlertPanel
FactoryStatus
Navigation
MiniMap
Tooltip
Modal
GameState

Keep components small and maintainable.

---

21. Initial Prototype

DO NOT attempt to build the complete game immediately.

First create a polished vertical slice.

The prototype should contain:

Factory

One factory.

Levels

At least 5 levels.

Assets

Approximately 5–10 assets per level.

Interactions

- Click level
- Zoom into level
- Click asset
- Show details
- Show connections
- Return to overview

Game mechanic

One cybersecurity mission.

Example:

"Secure the vendor remote access path."

The player must:

1. Find the external vendor connection.
2. Trace it into the OT environment.
3. Identify the vulnerable path.
4. Apply a security control.
5. Observe the improved security state.

---

22. Visual Prototype Priority

Prioritize visual quality in the first prototype.

The player should be able to immediately understand:

"What am I looking at?"

"Where am I?"

"What can I click?"

"What is important?"

"What should I investigate?"

If the game looks like a network diagram, redesign it.

The goal is an interactive industrial world.

---

23. Development Process

Work iteratively.

Phase 1

Create the factory overview.

Phase 2

Create clickable levels.

Phase 3

Create detailed level view.

Phase 4

Add clickable assets.

Phase 5

Add connections/data flow.

Phase 6

Add game state.

Phase 7

Add cybersecurity mission.

Phase 8

Add scoring.

Phase 9

Add attack scenarios.

Phase 10

Polish UX, animations, sound and visual feedback.

Do not jump to Phase 10 before Phases 1–7 work.

---

24. Code Quality

The project must be:

- TypeScript-first
- Modular
- Readable
- Strongly typed
- Easy to extend
- Data-driven
- Avoid unnecessary dependencies
- Avoid duplicated logic

Do not create one enormous React component.

Do not hard-code coordinates throughout the application.

Use configuration/data for factory content.

---

25. Important Requirement: Future Expansion

The architecture must eventually support:

Multiple factories

Different industries:

- Oil & Gas
- Manufacturing
- Food
- Pharma
- Energy

Different difficulty levels:

- Beginner
- Intermediate
- Advanced

Different scenarios:

- Ransomware
- Vendor compromise
- Insider threat
- USB malware
- Network intrusion
- PLC manipulation
- IT/OT lateral movement

Different standards/frameworks:

- Purdue Model
- IEC 62443
- NIST CSF
- MITRE ATT&CK for ICS

Do not implement all of these now.

Build the architecture so they can be added later.

---

26. First Task

Before writing significant code:

1. Analyze the requirements.
2. Propose the technical architecture.
3. Propose the folder structure.
4. Define the game-state model.
5. Define the factory data model.
6. Define the first factory.
7. Define the first mission.
8. Explain the interaction flow.
9. Identify the most important UX risks.
10. Then implement the first playable vertical slice.

Do not over-engineer the first version.

The first milestone is:

A visually impressive interactive factory where the player can see the complete architecture, click a level, zoom into it, inspect assets, follow connections, and complete one cybersecurity mission.

---

27. Design North Star

The experience should feel like:

"Google Maps + SimCity + industrial digital twin + cybersecurity investigation."

The player should feel like they are looking inside a real industrial facility and progressively discovering how everything is connected.

The factory visualization is not merely decoration.

The visualization IS the game.

Build the gameplay around exploration, understanding dependencies, identifying risk, making decisions, and seeing the consequences.
