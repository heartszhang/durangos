//
// pch.h
// Header for standard system include files.
//

#pragma once

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN             // Exclude rarely-used stuff from Windows headers
#endif

#include "targetver.h"
#include <xdk.h>
#include <windows.media.h>
#include <wrl.h>
//#include <d3d11_1.h>
//#include <DirectXMath.h>


// Windows Header Files:
//#include <windows.h>

#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>

#pragma comment(lib, "mfplat")
#pragma comment(lib, "mfuuid.lib")

using namespace Microsoft::WRL;
inline bool ok(HRESULT hr) { return SUCCEEDED(hr); }
inline bool failed(HRESULT hr) { return FAILED(hr); }