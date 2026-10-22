Unicode true
!include "MUI2.nsh"
Name "Tamkeen"
OutFile "Tamkeen_Admin_Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Tamkeen"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ICON "app/icon.ico"
!define MUI_UNICON "app/icon.ico"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Tamkeen.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Arabic"
Section "Install"
  SetOutPath "$INSTDIR"
  File /r "out/Tamkeen-win32-x64/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Tamkeen.lnk" "$INSTDIR\Tamkeen.exe" "" "$INSTDIR\icon.ico"
  CreateDirectory "$SMPROGRAMS\Tamkeen"
  CreateShortcut "$SMPROGRAMS\Tamkeen\Tamkeen.lnk" "$INSTDIR\Tamkeen.exe" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\Tamkeen\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tamkeen" "DisplayName" "Tamkeen Admin"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tamkeen" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tamkeen" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tamkeen" "Publisher" "Tamkeen"
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\Tamkeen.lnk"
  RMDir /r "$SMPROGRAMS\Tamkeen"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tamkeen"
SectionEnd
