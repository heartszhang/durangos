// WinRTComponent.cpp
#include "pch.h"
#include "JustForRT.h"

using namespace durango::adk;
using namespace Platform;

JustForRT::JustForRT()
{
}

void JustForRT::Hello() {
  OutputDebugStringW(L"hello winrt for xb1.\n");
}