from __future__ import annotations

from copy import deepcopy


def bubble_sort(values: list[int]) -> dict:
    arr = deepcopy(values)
    swaps: list[dict] = []

    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swaps.append({"type": "swap", "indices": [j, j + 1]})
    return {"sorted": arr, "steps": swaps}


def selection_sort(values: list[int]) -> dict:
    arr = deepcopy(values)
    swaps: list[dict] = []

    for i in range(len(arr)):
        min_index = i
        for j in range(i + 1, len(arr)):
            if arr[j] < arr[min_index]:
                min_index = j

        if min_index != i:
            arr[i], arr[min_index] = arr[min_index], arr[i]
            swaps.append({"type": "swap", "indices": [i, min_index]})
    return {"sorted": arr, "steps": swaps}


def quick_sort(values: list[int]) -> dict:
    arr = deepcopy(values)
    swaps: list[dict] = []

    def partition(low: int, high: int) -> int:
        pivot = arr[high]
        i = low - 1
        for j in range(low, high):
            if arr[j] <= pivot:
                i += 1
                if i != j:
                    arr[i], arr[j] = arr[j], arr[i]
                    swaps.append({"type": "swap", "indices": [i, j]})
        if i + 1 != high:
            arr[i + 1], arr[high] = arr[high], arr[i + 1]
            swaps.append({"type": "swap", "indices": [i + 1, high]})
        return i + 1

    def sort(low: int, high: int) -> None:
        if low < high:
            pi = partition(low, high)
            sort(low, pi - 1)
            sort(pi + 1, high)

    sort(0, len(arr) - 1)
    return {"sorted": arr, "steps": swaps}


def apply_swap_moves(initial: list[int], moves: list[dict]) -> list[int]:
    arr = deepcopy(initial)
    for move in moves:
        if move.get("type") != "swap":
            continue
        indices = move.get("indices", [])
        if len(indices) != 2:
            continue
        left, right = indices
        if not isinstance(left, int) or not isinstance(right, int):
            continue
        if left < 0 or right < 0 or left >= len(arr) or right >= len(arr):
            continue
        arr[left], arr[right] = arr[right], arr[left]
    return arr
