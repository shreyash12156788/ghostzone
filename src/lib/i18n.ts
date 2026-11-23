export type Language = 'en' | 'mr' | 'hi';

export interface Translations {
  appName: string;
  tagline: string;
  createRoom: string;
  joinRoom: string;
  howToPlay: string;
  roomCode: string;
  enterCode: string;
  yourName: string;
  pickAvatar: string;
  shareRoom: string;
  copyLink: string;
  copied: string;
  showQr: string;
  lobbyTitle: string;
  playersJoined: string;
  ready: string;
  notReady: string;
  startGame: string;
  waitingForHost: string;
  hostCrown: string;
  playArea: string;
  zoneRadius: string;
  useMyLocation: string;
  seekerPicker: string;
  randomSeeker: string;
  gameDuration: string;
  hidingDuration: string;
  revealInterval: string;
  revealLength: string;
  gracePeriod: string;
  roleRevealTitle: string;
  youAreSeeker: string;
  youAreHider: string;
  seekerSubtitle: string;
  hiderSubtitle: string;
  hidingPhaseTitle: string;
  runAndHide: string;
  eyesClosed: string;
  seekerReleasedIn: string;
  liveGame: string;
  nextReveal: string;
  revealActive: string;
  outOfZoneTitle: string;
  outOfZoneAlert: string;
  returnToZone: string;
  disqualified: string;
  iGotCaught: string;
  holdToConfirm: string;
  hidersFree: string;
  resultsTitle: string;
  seekerWon: string;
  hidersWon: string;
  playAgain: string;
  backHome: string;
  simulationMode: string;
  addBots: string;
  clearBots: string;
  testReveal: string;
  gpsRequired: string;
  enableGps: string;
  gpsActive: string;
  weakSignal: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'HideNSeek Live',
    tagline: 'Real-world GPS hide and seek with radar reveals on campus',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    howToPlay: 'How to Play',
    roomCode: 'Room Code',
    enterCode: 'Enter 6-digit Code',
    yourName: 'Your Name',
    pickAvatar: 'Choose Avatar Color',
    shareRoom: 'Invite Friends',
    copyLink: 'Copy Link',
    copied: 'Link Copied!',
    showQr: 'Show QR Code',
    lobbyTitle: 'Mission Lobby',
    playersJoined: 'Operatives Ready',
    ready: 'Ready',
    notReady: 'Not Ready',
    startGame: 'Launch Game',
    waitingForHost: 'Waiting for host to start...',
    hostCrown: 'Host',
    playArea: 'Game Boundary Zone',
    zoneRadius: 'Zone Radius',
    useMyLocation: 'Center on My GPS',
    seekerPicker: 'Designated Seeker',
    randomSeeker: '🎲 Random Operative',
    gameDuration: 'Game Duration',
    hidingDuration: 'Hiding Grace Period',
    revealInterval: 'Radar Interval',
    revealLength: 'Radar Active Time',
    gracePeriod: 'Out-of-Zone Grace',
    roleRevealTitle: 'Identity Assignment',
    youAreSeeker: 'YOU ARE THE SEEKER',
    youAreHider: 'YOU ARE A HIDER',
    seekerSubtitle: 'Wait for countdown. Hunt all hiders before time expires!',
    hiderSubtitle: 'Flee into the safe zone. Stay hidden between radar sweeps!',
    hidingPhaseTitle: 'Hiding Phase',
    runAndHide: 'Run & take cover!',
    eyesClosed: 'EYES CLOSED — SEEKER IN BRACE',
    seekerReleasedIn: 'Seeker released in',
    liveGame: 'Tactical Radar Active',
    nextReveal: 'Next Radar Scan',
    revealActive: '📡 RADAR SCAN ACTIVE',
    outOfZoneTitle: 'BOUNDARY BREACH!',
    outOfZoneAlert: 'is outside the operational zone!',
    returnToZone: 'RETURN TO SAFE ZONE',
    disqualified: 'DISQUALIFIED (Zone Breach)',
    iGotCaught: 'I Got Caught',
    holdToConfirm: 'Hold 2s to Confirm Tag',
    hidersFree: 'Hiders Hidden',
    resultsTitle: 'Mission Debrief',
    seekerWon: 'SEEKER WINS!',
    hidersWon: 'HIDERS EVADED!',
    playAgain: 'Play Again',
    backHome: 'Back to Base',
    simulationMode: 'Simulation Panel',
    addBots: 'Add 3 Bot Operatives',
    clearBots: 'Remove Bots',
    testReveal: 'Trigger Instant Radar',
    gpsRequired: 'GPS Permission Required',
    enableGps: 'Enable High-Accuracy Location',
    gpsActive: 'GPS Locked',
    weakSignal: 'Weak Signal',
  },
  mr: {
    appName: 'हाइड एन सीक लाइव्ह',
    tagline: 'कॅम्पसवर खऱ्या जीपीएससह लपाछपीचा थरार',
    createRoom: 'रूम तयार करा',
    joinRoom: 'रूममध्ये सामील व्हा',
    howToPlay: 'कसे खेळायचे',
    roomCode: 'रूम कोड',
    enterCode: '६ अक्षरी कोड टाका',
    yourName: 'तुमचे नाव',
    pickAvatar: 'अवतार रंग निवडा',
    shareRoom: 'मित्रांना बोलवा',
    copyLink: 'लिंक कॉपी करा',
    copied: 'लिंक कॉपी झाली!',
    showQr: 'QR कोड दाखवा',
    lobbyTitle: 'लॉबी',
    playersJoined: 'खेळाडू सज्ज',
    ready: 'सज्ज',
    notReady: 'अपूर्ण',
    startGame: 'खेळ सुरू करा',
    waitingForHost: 'होस्ट सुरू करण्याची वाट पाहत आहे...',
    hostCrown: 'होस्ट',
    playArea: 'खेळाचे क्षेत्र (सीमा)',
    zoneRadius: 'क्षेत्राची त्रिज्या',
    useMyLocation: 'माझ्या स्थानावर सेट करा',
    seekerPicker: 'राज्य घेणारा खेळाडू',
    randomSeeker: '🎲 यादृच्छिक खेळाडू',
    gameDuration: 'खेळाचा वेळ',
    hidingDuration: 'लपण्याची वेळ',
    revealInterval: 'रडार अंतर वेळ',
    revealLength: 'रडार दिसण्याचा वेळ',
    gracePeriod: 'सीमेबाहेर वेळ सवलत',
    roleRevealTitle: 'भूमिका वाटप',
    youAreSeeker: 'तुम्ही शोधक (सीकर) आहात!',
    youAreHider: 'तुम्ही लपणारे (हायडर) आहात!',
    seekerSubtitle: 'काउंटडाउनची वाट पहा. वेळेत सर्वांना शोधा!',
    hiderSubtitle: 'झोनमध्ये लपा. रडारपासून स्वतःला वाचवा!',
    hidingPhaseTitle: 'लपण्याचा टप्पा',
    runAndHide: 'पळा आणि सुरक्षित जागी लपा!',
    eyesClosed: 'डोळे मिटून थांबा — सीकर सज्ज होत आहे',
    seekerReleasedIn: 'सीकर सुटण्यास शिल्लक वेळ',
    liveGame: 'रडार थेट खेळ',
    nextReveal: 'पुढील रडार स्कॅन',
    revealActive: '📡 रडार स्कॅन सुरू आहे',
    outOfZoneTitle: 'सीमेबाहेर गेलात!',
    outOfZoneAlert: 'खेळाच्या क्षेत्राबाहेर गेला आहे!',
    returnToZone: 'लगेच क्षेत्रात परत या',
    disqualified: 'बाद झाला (सीमोल्लंघन)',
    iGotCaught: 'मी पकडला गेलो',
    holdToConfirm: 'खात्री करण्यासाठी २ सेकंद दाबून ठेवा',
    hidersFree: 'शिल्लक खेळाडू',
    resultsTitle: 'निकाल',
    seekerWon: 'सीकर जिंकला!',
    hidersWon: 'हायडर्स जिंकले!',
    playAgain: 'पुन्हा खेळा',
    backHome: 'मुख्य पृष्ठावर जा',
    simulationMode: 'सिम्युलेशन मोड',
    addBots: '३ बॉट्स जोडा',
    clearBots: 'बॉट्स काढा',
    testReveal: 'लगेच रडार दाखवा',
    gpsRequired: 'जीपीएस परवानगी आवश्यक',
    enableGps: 'जीपीएस सुरू करा',
    gpsActive: 'जीपीएस जोडले',
    weakSignal: 'कमकुवत सिग्नल',
  },
  hi: {
    appName: 'हाइड एन सीक लाइव',
    tagline: 'कैंपस में दोस्तों के साथ रियल-टाइम GPS छुपा-छुपी',
    createRoom: 'रूम बनाएं',
    joinRoom: 'रूम से जुड़ें',
    howToPlay: 'कैसे खेलें',
    roomCode: 'रूम कोड',
    enterCode: '६ अक्षरों का कोड डालें',
    yourName: 'आपका नाम',
    pickAvatar: 'अवतार रंग चुनें',
    shareRoom: 'मित्रों को आमंत्रित करें',
    copyLink: 'लिंक कॉपी करें',
    copied: 'लिंक कॉपी हो गया!',
    showQr: 'QR कोड देखें',
    lobbyTitle: 'मिशन लॉबी',
    playersJoined: 'खिलाड़ी तैयार',
    ready: 'तैयार',
    notReady: 'तैयार नहीं',
    startGame: 'खेल शुरू करें',
    waitingForHost: 'होस्ट के शुरू करने की प्रतीक्षा...',
    hostCrown: 'होस्ट',
    playArea: 'खेल का दायरा (ज़ोन)',
    zoneRadius: 'ज़ोन त्रिज्या',
    useMyLocation: 'मेरी लोकेशन पर सेट करें',
    seekerPicker: 'ढूंढने वाला (सीकर)',
    randomSeeker: '🎲 यादृच्छिक चुनें',
    gameDuration: 'खेल की अवधि',
    hidingDuration: 'छुपने का समय',
    revealInterval: 'रडार अंतराल',
    revealLength: 'रडार दृश्य समय',
    gracePeriod: 'बाहर जाने पर ग्रेस समय',
    roleRevealTitle: 'भूमिका आवंटन',
    youAreSeeker: 'आप सीकर (ढूंढने वाले) हैं!',
    youAreHider: 'आप छुपने वाले हैं!',
    seekerSubtitle: 'उलटी गिनती का इंतज़ार करें। समय खत्म होने से पहले सबको ढूंढें!',
    hiderSubtitle: 'सुरक्षित ज़ोन में छुपें। रडार से सतर्क रहें!',
    hidingPhaseTitle: 'छुपने का दौर',
    runAndHide: 'भागें और छुप जाएं!',
    eyesClosed: 'आंखें बंद रखें — सीकर रुका हुआ है',
    seekerReleasedIn: 'सीकर छूटेगा',
    liveGame: 'लाइव रडार गेम',
    nextReveal: 'अगला रडार स्कैन',
    revealActive: '📡 रडार स्कैन सक्रिय है',
    outOfZoneTitle: 'दायरे से बाहर!',
    outOfZoneAlert: 'खेल के दायरे से बाहर चला गया है!',
    returnToZone: 'तुरंत दायरे में लौटें',
    disqualified: 'बाहर (सीमा उल्लंघन)',
    iGotCaught: 'मैं पकड़ा गया',
    holdToConfirm: 'पुष्टि के लिए २ सेकंड दबाए रखें',
    hidersFree: 'बचे हुए खिलाड़ी',
    resultsTitle: 'खेल का परिणाम',
    seekerWon: 'सीकर जीता!',
    hidersWon: 'छुपने वाले जीते!',
    playAgain: 'फिर से खेलें',
    backHome: 'होम पर जाएं',
    simulationMode: 'सिमुलेशन पैनल',
    addBots: '३ बॉट्स जोड़ें',
    clearBots: 'बॉट्स हटाएं',
    testReveal: 'तुरंत रडार दिखाएं',
    gpsRequired: 'GPS अनुमति आवश्यक है',
    enableGps: 'GPS चालू करें',
    gpsActive: 'GPS सक्रिय',
    weakSignal: 'कमजोर सिग्नल',
  },
};
