from algorithm_engine.sorting import apply_swap_moves, bubble_sort, quick_sort, selection_sort


def test_bubble_sort_returns_sorted_array_and_steps():
    result = bubble_sort([5, 1, 4])
    assert result["sorted"] == [1, 4, 5]
    assert len(result["steps"]) > 0


def test_selection_sort_returns_sorted_array():
    result = selection_sort([3, 2, 1])
    assert result["sorted"] == [1, 2, 3]


def test_quick_sort_returns_sorted_array():
    result = quick_sort([8, 3, 7, 2])
    assert result["sorted"] == [2, 3, 7, 8]


def test_apply_swap_moves_applies_valid_moves_only():
    final_array = apply_swap_moves(
        [3, 1, 2],
        [
            {"type": "swap", "indices": [0, 1]},
            {"type": "swap", "indices": [1, 2]},
            {"type": "swap", "indices": [10, 11]},
        ],
    )
    assert final_array == [1, 2, 3]
