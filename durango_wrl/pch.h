//
// pch.h
// Header for standard system include files.
//

#pragma once

#include <xdk.h>
#include <wrl.h>
#include <d3d11_1.h>
#include <DirectXMath.h>

namespace DX
{
    inline void ThrowIfFailed(HRESULT hr)
    {
        if (FAILED(hr))
        {
            // Set a breakpoint on this line to catch DirectX API errors
            throw Platform::Exception::CreateException(hr);
        }
    }
}
